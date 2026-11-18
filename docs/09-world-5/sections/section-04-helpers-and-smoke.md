# Helpers, smoke and hand-over

## Contract
### REQ-W5-04
Source: spec.md#L20-L20
Behavior: Learning from thumbs-up (reward model from picks; a compliment-loving judge breeds a yes-man); Looking things up (local shelf fetched by meaning; mission: hand it the wrong book); AI that takes actions (scripted helper, local tools, played step by step; mission: endless loop); Pictures and words together (photo fingerprints and caption words in one map; mission: a wrong caption still called a match). No live model or outside API.
Expected: unit test per lesson; `e2e/world-5.spec.ts` smoke passes for all 17 lessons with nothing sent elsewhere.
Command: E2E_PORT=4209 pnpm e2e e2e/world-5.spec.ts

## Owned files
- four lesson folders; public/models/picture-words-v1/; scripts/build-picture-words.ts
- e2e/world-5.spec.ts, e2e/w5-*.spec.ts; World 5 hand-over in docs/architecture.md
- Shared, additive: locked-lesson examples move to a World 6 lesson; public/models/README.md lines

## Compatibility
```json
{"version": 1, "mode": "not_required", "reason": "New lessons; shared edits only swap an unbuilt example lesson, checked by the existing suites."}
```

## Evidence
Picture fingerprints come from the shipped MobileNet (Apache-2.0) on photos-v1; the alignment is ours (MIT). Tones stay calm for RLHF and hallucination.

Rollback: revert the section commit.
Ownership: single writer (this session); no other stage touches these paths.

## Review
Verdict: pass
Reviewed: risks line 28 (no live API); done-command twice under the lock.
