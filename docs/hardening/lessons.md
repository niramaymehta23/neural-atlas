# Lesson fixes: the four headline lessons

Shared problems (error boundaries, snapshot clamping, guess locking, replay windows, compare split) are fixed once in platform.md; items here are lesson-specific. Each lesson also gets a `parseState` clamp (PLT-02).

## Rolling downhill (src/modules/w1-foundations/rolling-downhill)

### DH-01 · High · The guess never unlocks when the tab is hidden or throttled
- Cause: `useRecordedRun` (`scene.tsx:26-38`) puts 121 precomputed frames on the timeline one per `requestAnimationFrame`; rAF pauses in background tabs, so recording stalls (seen live at 10 of 121) and `firstToSettle` (`model.ts:132`) stays null. "Roll again" appears as soon as `runs > 0` (`controls.tsx:53`), not at the end.
- Fix: record all frames at once with `timeline.record` (the reduced-motion path already does) and animate only the cursor. Base "running" and the button label on the final frame being recorded.
- Test: rAF stubbed to never fire, one roll → timeline length 121, reveal enabled.

### DH-02 · High · Predict-then-reveal is a multiple choice after the fact
- Problem: the spec (prompt 4) asks learners to tap where each ball will end before starting, with ghost markers; the lesson has a multiple-choice card that can be answered after watching (PLT-09).
- Fix: tap-to-guess end spots drawn as ghost markers, locked when the roll starts; reveal compares spots with outcomes. Keep the guess card above the start button (LIVE-11).
- Test: guess after a finished roll keeps the reveal disabled until a new roll.

### DH-03 · Medium · The guess answer is wrong for fly-offs, ties and the saddle
- Evidence: `model.ts:130-141` (sorts by settle step, height, array order). Pass (0.99, 0.99) at dial 1: all fly off, answer "Steady walker". Start at the bottom: tie always to Steady walker. Bowl at dial 0.7: nobody settles, lowest reported.
- Fix: "None of them" choice; flown-off walkers never settle; settle only where curvature is positive; a "they tied" outcome.
- Test: `model.test.ts` cases for each.

### DH-04 · Medium · The fly-off mission fires without big steps
- Evidence: `missions.ts:10` fires when any walker leaves; ravine corner start fires from dial 0.19 via the rolling ball's speed. The success caption describes the steady walker's overshoot.
- Fix: fire only when the steady walker leaves, or check `stepSize > 2 / curvature` for the walker that left; otherwise a caption naming the walker and cause.
- Test: `when` false for ravine, step 0.19, keepRolling 0.9, start (0.99, 0.99).

### DH-05 · Medium · Every dial tick re-rolls and replaces the ghost
- Evidence: `scene.tsx:39` deps include every dial.
- Fix: re-roll only on `runs`/`start`, or after the drag ends (pointerup/keyup).
- Test: 10 dial changes after one roll → at most one more `newRun`; ghost equals the run before the drag.

### DH-06 · Medium · The mistake curve drops when walkers fly off; bumpy field goes negative
- Evidence: `model.ts:90-92`, `model.ts:17`.
- Fix: a flown-off walker counts at the map's maximum height (or plot per walker); shift bumpy up by 0.16.
- Test: all-off loss ≥ max on-map height; bumpy minimum ≥ 0.

### DH-07 · Medium · Missing spec parts (prompt 4)
- Missing: orbiting the valley (drei `OrbitControls` with damping and limits behind a "turn the valley" affordance); the drawer animating the update rule in step with the cursor (read `timeline.current()`); slow-motion replay (≈8 fps, ≥2 s).
- Test: dragging the canvas changes the camera azimuth; replay lasts ≥2 s.

### DH-08 · Low · Walkers are hard to tell apart; valley framing looks like a sheet
- Evidence: `scene.tsx:15` (`WALKER_TONES = [ink, sage, ink-soft]`); confirmed live: walkers start stacked so only one shows, the bowl is seen from low with clipped edges and a big empty area below.
- Fix: distinct tones checked against both terrain ends plus a shape per walker (A11Y-20); offset the three start points slightly; frame the camera higher so the whole bowl shows.
- Test: pairwise ΔE > 20 and >3:1 against terrain; screenshot shows three walkers at start.

Keyboard drop spot and legend buttons: A11Y-11, A11Y-20. WebGL fallback: ENG-12.

## Stacking cells (src/modules/w3-neural-networks/stacking-cells)

### MLP-01 · High · The decision field drops far below 60 fps on bigger teams
- Evidence: `createFieldReader` for 2-8-8-8-8-1 on 48×48 takes 30 ms per redraw (measured) vs 4.6 ms for the default; recomputed every epoch on the main thread (`scene.tsx:91-105`); `MLP.predict` allocates a `Value` per neuron (`src/engine/autodiff/nn.ts:94-107`).
- Fix: typed-array forward pass in `src/engine/model/forward.ts`; at most one redraw per animation frame, skipping if the last took >8 ms; or compute the field in the worker.
- Test: unit benchmark (4×8 field under 4 ms); the perf e2e repeated at max layers and cells.

### MLP-02 · Medium · Old fences stay painted after a new try, reshape or garden change
- Evidence: `scene.tsx:77`, `src/data/DecisionField.tsx:43` (returns early on null without clearing).
- Fix: clear on null; better, draw the untrained team's field at once from initial parameters (MLP-08).
- Test: outputs then null → canvas cleared.

### MLP-03 · Medium · Empty or tiny gardens flood the main thread
- Evidence: see ENG-08; "Practised about 2 million times" with zero loss.
- Fix: no training with fewer than 2 points or one group ("Plant some flowers of both kinds first"); throttle snapshots to ≤30/s; write `epochs` to state on pause or share, not every snapshot.
- Test: empty garden keeps "Let it learn" disabled with the hint.

### MLP-04 · Medium · Large gardens slow the page and break links; no eraser
- Evidence: `src/data/PaintCanvas.tsx:22` (a dot per 0.06 units, no cap), `scene.tsx:81`; 3000 dots → 300 ms epochs.
- Fix: cap at 400 points with a note; batch `setData` per frame; share size check (PLT-12); an eraser brush or tap-to-remove.
- Test: 500 plants stay at the cap; eraser removes a point.

### MLP-05 · Medium (suspected) · Mission and guess can read the previous team's last frame
- Evidence: `ModuleShell.tsx:87`.
- Fix: frames carry a `runKey` (shape + attempt); `when`/`answer` require a match.
- Test: `when(oneCellSpiral, frameFrom2CellRun)` is false.

### MLP-06 · Low (suspected) · A disposed worker's queued snapshots land in the new run
- Evidence: `src/engine/model/model-engine.ts:118`.
- Fix: `port.onmessage = null` and a `disposed` guard in `dispose`.

### MLP-07 · Medium · Missing spec parts (prompt 5)
- Missing: activation colouring and backward flow particles on `NetworkView` (`scene.tsx:155`); hover mini-field per hidden cell; per-layer activation choice; missions "fewest cells for the spiral", "every cell switched off", "overfit with 5 points".
- Fix: implement them (wording through check-captions).
- Test: hover shows a mini field; activation selector changes the model; e2e per mission.

### MLP-08 · Low · The lesson opens with an empty field
- Fix: post a frame-0 snapshot on init and draw it.
- Test: field has non-paper pixels before "Let it learn".

### MLP-09 · Medium · Missing tests
- Fix: e2e that the spiral mission fires (one cell, one layer, learn → "You earned a star."); per-lesson share → open → same view; fix the vacuous assertion `model.test.ts:36` (`below.at(-1)`).

### MLP-10 · Low · Wording
- Confirmed live: the paint toggle reads "Blue / Green" with no label (A11Y-08); the mission "Draw a spiral with one cell" reads oddly — reword to "Try to fence in the spiral with just one cell".

Paint canvas scroll-blocking on phones: see QL-14 (same fix for PaintCanvas).

## Who is looking at whom (src/modules/w5-transformers/who-is-looking-at-whom, src/engine/pretrained)

### ATT-01 · High · Any 2–3 word sentence wins the "hog" mission, even mid-typing
- Evidence: `missions.ts:6,13`, `src/engine/pretrained/attention.ts:74-83`; "hi there" scores 1.0, the intended hint sentence only 0.43 at depth 6.
- Fix: at least 6 real words; hog share ≥0.4 and ≥4/(n−1).
- Test: 2- and 3-word readings don't fire; e2e: hint sentence at depth 6 earns the star.

### ATT-02 · High · The guess's right answer changes with the dials
- Evidence: `model.ts:37-49`, `predictions.ts:10`; "it" looks most at "tired" at depths 1–3 and 6, "dog" at 4–5.
- Fix: compute the answer at a fixed depth with all readers blended (or averaged over depths 4–6), regardless of dials; caption agrees.
- Test: `frameFor` gives the same answer for every depth and reader; a recorded real-model fixture.

### ATT-03 · High · First load is ~49 MB with no progress and no timeout
- Evidence: model 21.4 MB + runtime wasm 26.9 MB + tokenizer 0.7 MB; `attention-worker.ts:27-33` (no `progress_callback`), `scene.tsx:95-97`; spec asks for weights to stream in behind an animated intro (`docs/requirements.md:337`).
- Fix: `progress_callback` → progress events → a progress bar with a plain caption and a short animated intro; stall timeout with "Try again"; smaller wasm (HOST-15).
- Test: progress events forwarded; e2e with a throttled model sees the progress change.

### ATT-04 · High · Chips show tokenizer pieces, and dragging rewrites the sentence
- Evidence: `attention.ts:20-36`, `scene.tsx:86`, `model.ts:53-58`; "can't" → `can | ' | t`, accents removed, `[UNK]` written into the text box, everything lowercased.
- Fix: group tokens under the learner's own words (tokenize each original word and count its pieces); show original spelling with punctuation attached; `moveWord` works on original words.
- Test: "Héllo, can't 😀" → `["Héllo,", "can't", "😀"]`; a move keeps the original text.

### ATT-05 · Medium · Returning visitors keep an old model forever
- Fix: versioned model folder (HOST-16), set in `runtime.ts` and written by the export script.

### ATT-06 · Medium · Any reading error throws away the model and blames start-up
- Evidence: `attention-worker.ts:42,51-54`, `scene.tsx:22,69,96`; a link can carry a 3000-character sentence.
- Fix: reset `loading` only on load failure; clip to `MAX_LETTERS` in `useReading` and on restore, tokenizer `truncation: true, max_length: 128`; separate "couldn't load" and "couldn't read this sentence" messages with retry.
- Test: a sentence error doesn't reload the model; a 2000-character initial sentence is clipped.

### ATT-07 · Medium · Empty or one-word sentence: the lesson goes silent
- Fix: status "Type a few words to see them look at each other."

### ATT-08 · Medium · The guess waits silently once the example sentence is edited
- Evidence: `model.ts:40-42`.
- Fix: the card offers "Bring back the example sentence" when there's no answer.

### ATT-09 · Medium · Compare shows the same thing twice by default
- Evidence: `index.ts:13,24`.
- Fix: when reader is "all", compare against one characterful reader; otherwise against "all".
- Test: `compare(initialState)` differs from `initialState`.

### ATT-10 · Medium · Threads can't show hogging or direction
- Evidence: `threads.tsx:29-35,65-71` (thickness relative per word; A→B and B→A share a curve), `captions.ts:6`.
- Fix: thickness from the absolute share; A→B above the line, B→A below (or taper from the looker).
- Test: `arc(0,3,5) !== arc(3,0,5)`; strengths equal raw looks.

### ATT-11 · Medium · Many words: overlap, n² threads, scrolling blocked on phones
- Evidence: `threads.tsx:23-24,75-79,123`; confirmed live: default sentence overflows at 1024px (A11Y-19).
- Fix: cap at ~16 words with a note; slots from measured widths; top 2 threads per word in "everyone" mode; drag from a handle or long-press so swipes scroll.
- Test: 16 words at 375px: no overlap; swipe scrolls.

### ATT-12 · Medium (suspected) · Dragging a word also counts as a tap
- Evidence: `threads.tsx:103-121`.
- Fix: a `dragged` ref set in `onDragStart` ignores the next click.
- Test: after dragging "dog" onto "road", "it" keeps `aria-pressed=true`.

### ATT-13 · Medium · Keyboard reordering is hidden and may clash with browser Back
- Fix: sortable pattern (Space pick up, arrows move, Space drop); live announcement "dog moved after road"; keys in the hover note (A11Y-10).

### ATT-14 · Medium · Screen readers can't tell who looks at whom
- Fix: chip `aria-description` "looks most at dog, then tired" (A11Y-13).

### ATT-15 · Low · Old picture shown under a new sentence
- Evidence: `scene.tsx:49-51,95-97`.
- Fix: soft "reading…" overlay while the sentence differs from the loaded one.

### ATT-16 · Low · Reader memory is FIFO and can reach ~78 MB
- Evidence: `attention-client.ts:35-48`, `attention-worker.ts:43,50`.
- Fix: LRU capped by bytes; transfer `weights.buffer`; terminate when unused (ENG-13).

### ATT-17 · Medium · No licence file or credit for the bundled model
- Fix: `public/models/attention-minilm/LICENSE` (Apache-2.0) and NOTICE; drawer credit "all-MiniLM-L6-v2 by sentence-transformers, Apache-2.0"; `copy-runtime.ts` also copies the onnxruntime-web licence.
- Test: licence files exist; drawer names the model.

### ATT-18 · Low · Model export can't be reproduced; runtime copy is fragile
- **Status:** Fixed in fd27c88 (`scripts/requirements-export.txt`, pinned revision, checksums in the model README checked by `pnpm check-model`, hash compare and version check in `copy-runtime`, `check-build` fails on a missing runtime; the pinned export reproduces the committed model byte for byte).
- Evidence: `scripts/export-attention-model.py:8,37-38`; `scripts/copy-runtime.ts:19-29` (size-only compare).
- Fix: `requirements-export.txt` with exact versions, pinned HF revision, SHA-256 in the README checked in CI; hash compare; `prebuild` fails if the runtime is missing. Git LFS: REPO-19.

### ATT-19 · Low · Spec gaps (prompt 6)
- Missing: the "all heads" gallery and words in an arc; "reader 7" is a bare number.
- Fix: implement the gallery (or record its move to "Many readers at once" in architecture.md); give readers plain names.

## Scoring every move (src/modules/w6-reinforcement/scoring-every-move, src/engine/rl, src/visuals/Board)

### QL-01 · High · Painting while scrubbed back changes a board you can't see
- Evidence: `scene.tsx:146-148,158-163`.
- Fix: `timeline.goLive()` before painting.
- Test: seek, paint → live and `data-tile` updated.

### QL-02 · Medium · Curiosity dial says "never tries new moves" at its default
- Evidence: `controls.tsx:16-19,25`, `index.ts:16`, `model.ts:53` (ε = 0.1 at default). Confirmed live.
- Fix: "never" only below 0.02, then "now and then", "sometimes", "often".

### QL-03 · Medium · Treats are never eaten and look like the heatmap
- Evidence: `src/engine/rl/gridworld.ts:58`, `encodings.ts:93,105-109`.
- Fix: each treat pays once per try (or make pacing the stated reward-hacking mission with a caption); a treat icon.
- Test: two visits in one try reward once.

### QL-04 · Medium · Square types are colour only; puppy is a clay dot
- Fix: icons per tile and a puppy icon (A11Y-07, A11Y-24).

### QL-05 · Medium · No bowl, unreachable bowl or all lava: no feedback
- Fix: reachability check after each paint; status "There's no bowl" / "The bowl can't be reached" (this is also the spec's "maze it cannot solve" mission).
- Test: `reachable(world)` unit test; message renders.

### QL-06 · Medium · Slips are invisible
- Evidence: `gridworld.ts:46-59`.
- Fix: `step` returns `slipped`; a brief skid on the puppy at slow speeds.

### QL-07 · Medium · Shared links don't reproduce the view
- Evidence: `scene.tsx:31,48-60,91`, `model.ts:29-30` (final dials and board replayed; capped at 2000 tries; replay overwrites the saved count).
- Fix: compact edit log (try number → tiles or dial change) replayed; or snapshot the 140-number score table quantised and resume from it. No silent cap.
- Test: `episodes: 2500` gives a consistent tries count; log replay equals live run.

### QL-08 · Low · Repainting under the puppy carries the old try's score
- Evidence: `src/engine/rl/q-learning.ts:131-137`.
- Fix: also reset `reward` and `jumps`.

### QL-09 · Medium · Score arrows exaggerate tiny differences
- Evidence: `scene.tsx:111-120`.
- Fix: scale by absolute difference over the board-wide range; nothing below a threshold.

### QL-10 · Low · Reward line has no reference and a shifting scale
- Evidence: `src/visuals/Chart.tsx:29`.
- Fix: clamped scale with a faint "broke even" line.

### QL-11 · Low · Default speed is too fast to follow
- Evidence: `model.ts:59` (0.5 ≈ 95 moves/s labelled "a quick run").
- Fix: lower default; labels match real speeds.

### QL-12 · Low (suspected) · Shell re-renders ~60×/s while playing
- Evidence: `scene.tsx:91`.
- Fix: throttle `update({episodes})` to ~4/s plus on pause (with PLT-20).

### QL-13 · Medium · Keyboard painting gives no feedback (A11Y-12)

### QL-14 · Low · Board and paint canvas block page scrolling on phones
- Evidence: `Board.tsx:100`, `PaintCanvas.tsx:101` (`touch-none`).
- Fix: on coarse pointers paint only after a short hold or in an explicit paint mode.
- Test: at 375px a vertical swipe scrolls and paints nothing.

### QL-15 · Low (suspected) · Dark theme: walls glare and look like arrows
- Fix: dedicated wall tone for night.

### QL-16 · Low · Mission threshold and dial words disagree
- Evidence: `missions.ts:6` (≥0.85) vs `controls.tsx:19` ("at once" from 0.67).
- Fix: move the band to 0.85.

### QL-17 · Low · Spec gaps (prompt 7)
- Missing: the "telescope" visual for how far ahead it cares; missions reward hacking (QL-03), never explore, unsolvable maze (QL-05); the heatmap fading in.
- Fix: implement them.

### QL-18 · Low · Copy: "zero tries so far." starts lowercase (confirmed live)
- Fix: sentence-case the number word at the start of a sentence (fix in `src/design/copy.ts` so every lesson benefits).
