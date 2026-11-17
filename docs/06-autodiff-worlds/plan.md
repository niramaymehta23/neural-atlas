# Stage 06 plan: Worlds 1 and 3 (Forge, lean)

Spec: [spec.md](spec.md). Requirements: REQ-W13-01..03. Base: main 4d71718.

## Contract

- Nine World 1 lessons and ten World 3 lessons, each a folder shaped like `rolling-downhill` /
  `stacking-cells`: `model.ts` (pure state, frames, run logic), `captions.ts`, `missions.ts`,
  `predictions.ts`, `scene.tsx`, `controls.tsx`, `drawer.tsx`, `index.ts`, colocated tests.
- Every lesson, from the start: `parseState` (clamp every number to its dial, cap every list),
  `describe()`, the shell's error boundary (an engine failure is thrown from render), links that
  replay exactly (runs are rebuilt from state with the same seed), no colour-only cues (shape,
  dash or a word beside every colour), keyboard and touch use (holds before a finger paints or
  drags; swipes scroll), no layout jumps (reserved heights), phone layout, both themes, reduced
  motion (no playback animation, the end state at once).
- Training runs are **recorded whole**: a run is a pure function of state (settings + seed + run
  counter), worked out in time-boxed slices on the main thread (≤ 6 ms per slice, so the page
  keeps 60 fps), recorded into the timeline at once and played from its start (DH-01 pattern).
  The models are tiny (≤ ~700 numbers), so a worker would cost more than it saves; the
  `ModelEngine` worker stays for the open-ended practice of Stacking cells.
- A change of setting after a run asks for one new run once the dial rests (DH-05 pattern); the
  previous run becomes the ghost (ghost runs).

## Shared pieces

| Piece | Where | Used by |
|---|---|---|
| Dense net maths: typed-array forward/backward, layer calming, switch-off, schedules, per-layer blame and activity | `engine/autodiff/dense.ts` | most World 3 lessons, several World 1 |
| Least squares and polynomial fits | `engine/fit/` | what-the-machine-sees, stubborn-vs-jumpy |
| Landscape race (promoted from Rolling downhill) | `features/building/race/` | rolling-downhill, smarter-ways-downhill |
| Recorded run hook (slices, record whole, play, re-run after a dial rests) | `features/building/use-recorded-run.ts` | every training lesson |
| Run chart with the ghost run | `features/building/RunChart.tsx` | every training lesson |
| Weights on strings | `features/building/WeightStrings.tsx` | one-tiny-brain-cell, what-the-machine-sees |
| Gradient rain | `features/building/GradientRain.tsx` | passing-back-the-blame, keeping-things-steady |
| Activation strip | `features/inside/ActivationStrip.tsx` | the-decision-curve, keeping-things-steady |
| Data lens | `features/inside/DataLens.tsx` | splitting-into-groups, how-sure-is-it |
| LR finder, batch blender, init roulette, normalisation flatten | lesson folders (one consumer each) | big-steps-then-small, smarter-ways-downhill, where-you-start, keeping-things-steady |

## Lessons

| Lesson | Interaction | Mission (predicate) |
|---|---|---|
| teach-by-showing | sort fruit into two baskets; the robot copies and sorts new fruit | wrong labels drop the robot's score |
| what-the-machine-sees | pick facts about houses; strings show how much each fact counts | hide size: guesses go far off |
| drawing-the-best-line | drag a line, miss bars; let it find the best line | one far-off dot tilts the line |
| splitting-into-groups | paint two kinds; a straight fence learns; data lens | no straight fence gets most right |
| keeping-score-of-mistakes | strictness dial from gentle to strict; cost squares | gentle scorer ignores the rare group |
| memorising-vs-understanding | practice vs exam curves as it practises | practice near perfect, exam bad |
| the-surprise-test | hide-share dial; practice, surprise and brand-new scores | peeking makes the surprise score lie |
| stubborn-vs-jumpy | darts of many robots around a bullseye | darts scatter everywhere |
| how-sure-is-it | confidence bars over guesses; data lens | 100% sure and wrong |
| one-tiny-brain-cell | pluck strings for trust; voices on and off | it never says yes |
| the-decision-curve | swap the bend; activation strip | cells go silent forever |
| thinking-forwards | values flow layer by layer | nonsense in, sure answer out |
| passing-back-the-blame | gradient rain in a deep stack | rain dries up before the start |
| smarter-ways-downhill | three walkers race; batch blender | the careful walker loses |
| big-steps-then-small | draw a step plan; LR finder | the plan stops before arriving |
| where-you-start | init roulette; same-start toggle | every cell starts the same |
| dont-cram | switch cells off while it learns | so many off it learns nothing |
| keeping-things-steady | calm vs wild signals; normalisation flatten, strip, rain | very deep without calming stalls |
| it-can-draw-anything | draw a squiggle; add cells | too few cells for the doodle |

## Verification

Unit tests for the new maths against the `Value` autodiff (gradients) and closed forms; a model
test and a shell test per lesson (missions, guesses, parseState, describe, link replay);
`e2e/world-1.spec.ts` and `e2e/world-3.spec.ts` smoke every lesson (opens on its story, real
name held back, one interaction, a mission fires, no console errors, link reopens the view);
axe on every new page (day/night, 1280 and 320 with reduced motion). Done = the full
done-command twice in a row.
