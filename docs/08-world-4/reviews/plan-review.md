# Plan review (lean, self)

Reviewed: section boundaries, ownership (World 4 folders, `features/generative`, new engine folders and model
folders), DoD coverage per lesson, the hardening items most likely to recur (clamping, links that replay, colour-only
cues, touch scrolling, layout jumps, load failures, true answers).

Findings applied:
1. Building World 4 unlocks the lessons older tests used as locked examples: those tests move to World 5.
2. The attention lesson's worker pattern (time-outs, restart, retain/release) is copied for MobileNet so a stalled
   load cannot hang the page.
3. Webcam pictures cannot travel in a link: links carry sample-photo choices only, and the lesson says so.
4. Generative decoders are small enough for main-thread typed arrays, which keeps them deterministic and testable.

Verdict: pass.
