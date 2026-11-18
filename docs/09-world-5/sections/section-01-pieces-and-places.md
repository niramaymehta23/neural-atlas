# Pieces and places

## Contract
### REQ-W5-01
Source: spec.md#L17-L17
Behavior: Chopping text into pieces (GPT-2 byte pieces; a dial applies only the first merges; mission: more pieces than letters); Words as places (GloVe; king − man + woman; mission: let it land on a start word); Many readers at once (the attention model's twelve readers as switchable cards; mission: switch off readers until most of the picture is lost); Knowing the order (word codes plus wave stamps; mission: shuffle with stamps off unnoticed).
Expected: tokenizer equals Transformers.js GPT-2 on English, Gujarati, emoji and code; analogy lands on queen; each lesson test covers mission, near miss, guess, clamping, describe.
Command: pnpm vitest run src/engine/language src/modules/w5-transformers

## Owned files
- src/engine/language/bpe.ts, word-vectors.ts, files.ts and tests
- src/features/language/ (file hook, status line)
- src/modules/w5-transformers/{chopping-text-into-pieces,words-as-places,many-readers-at-once,knowing-the-order}/
- public/models/gpt2-pieces-v1/, public/models/glove-words-v1/, scripts/fetch-language-files.py
- src/catalog/world-5.ts (load lines)

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lessons, engine files and model folders; no existing behaviour changes."}
```

## Evidence
Sources checked 2026-11-18: `openai-community/gpt2` revision 607a30d (MIT); `fse/glove-wiki-gigaword-50` revision 6d69f9a (PDDL), cut to frequent plain words, int8 with a per-word scale. Many readers reuses `attentionReader()` with its own small hook, since who-is-looking-at-whom is additive-only.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: curriculum rows, DoD, hardening lists (ATT-02 dial-free answers, LIVE-08 jumps); guesses compare fixed preset texts.
