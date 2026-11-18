# Plan review (lean, self)

Reviewed: section boundaries, ownership, DoD per lesson, hardening items most likely to recur.

Findings applied:
1. Building "Chopping text into pieces" unlocks the lesson older tests used as the locked example: they move to World 6.
2. The next-word guess reads the model at a fixed setting, so the sampling dials never change its answer (ATT-02).
3. Baby GPT batches come from (seed, step), so a link replays the same run however it was chunked (ENG-09).
4. Every fetched file gets a timeout and a plain failure line with Try again.

Verdict: pass.
