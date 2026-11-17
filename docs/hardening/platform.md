# Platform fixes (src/platform, src/ui shell parts)

Each item: severity, the problem, evidence, the fix, the test that proves it. Paths are from the repo root.

## PLT-01 · High · One bad saved entry wipes all progress
- Problem: if one lesson record fails validation, `parseProgress` drops the whole value and the next save writes back an almost empty object. The companion model resets the same way.
- Evidence: `src/platform/progress/progress.ts:44-51`, `src/platform/storage.ts:66,73-77`, `src/platform/companion.ts:22-31`.
- Fix: salvage entries one by one (keep valid ones; coerce an invalid one to `{visited: !!e.visited, missions: strings only, predicted: !!e.predicted}`); return null only when the top level is not an object. Fill missing companion fields from `freshCompanion` field by field. In `createPersistedStore.change`, when a raw value exists but `parse` returns null, copy it to `${key}-corrupt-${Date.now()}` before writing.
- Test: progress test seeds one valid and one invalid lesson, calls `recordVisit("c")`, asserts lesson "a" survives. Same for companion missing `convolution`.
- Fixed in 5eefcc8.

## PLT-02 · High · A hand-made snapshot link can freeze or crash the tab
- Problem: `mergeState` checks only value types. `layers: 100000` goes straight into `modelOf`.
- Evidence: `src/platform/snapshot.ts:56-67`, `src/modules/w3-neural-networks/stacking-cells/model.ts:61-65`.
- Fix: add `parseState?: (saved, initial) => S` to `ModuleDefinition` (`contract.ts:72`); `decodeSnapshot` runs it after `mergeState`. Required for any module with numeric dials or arrays; the four headline lessons and the fixture clamp every number and cap array lengths. `mergeState` rejects non-finite numbers.
- Test: snapshot test decodes an out-of-range link and asserts clamped values; stacking-cells test asserts layers/cells above the dial max are clamped.
- Fixed in 040feeb.

## PLT-03 · High · "Link copied" shows when nothing was copied
- Problem: `writeText` runs after `await encodeSnapshot`, so Safari rejects it (gesture expired); on plain http `navigator.clipboard` is undefined; failures are swallowed and success still shows. Missing `CompressionStream` throws an unhandled rejection.
- Evidence: `src/platform/ModuleShell.tsx:107-119`.
- Fix: call `navigator.clipboard.write([new ClipboardItem({"text/plain": encodePromise.then(url => new Blob([url]))})])` synchronously in the click handler; try/catch everything; on failure show "Couldn't copy, here is the link" with a read-only pre-selected input; set `shared` only after the write resolves.
- Test: ModuleShell test with clipboard undefined, then rejecting: fallback field shows, "Link copied" does not.
- Fixed in 040feeb.

## PLT-04 · High · No error boundary; a failed lesson load hangs forever
- Problem: any throw from a module's scene, controls, drawer, `prediction.answer` (called in render, `ModuleShell.tsx:214`) or `compare()` (`:177`) blanks the page. A chunk that fails to load leaves "Setting the scene…" forever. `/puzzle` has no catch or loading state. A throwing `mission.when` silently skips the other missions.
- Evidence: `src/platform/LessonView.tsx:18-25`, `src/platform/PuzzleView.tsx:24-27`, `ModuleShell.tsx:83-100`; no `src/app/error.tsx`, no ErrorBoundary in src.
- Fix: a `LessonErrorBoundary` around scene, dock and drawer separately, with a plain caption and "Try again" that remounts via `key`. Add `src/app/error.tsx` and `global-error.tsx`. LessonView `.catch(() => setLoaded("failed"))` with a retry message. PuzzleView loading and failure states. Wrap each `mission.when` in try/catch.
- Test: ModuleShell with a throwing scene still renders the dock; LessonView with a rejecting `load` shows retry; e2e aborts the lesson chunk and expects the retry text.
- Fixed in 040feeb, b958e20.

## PLT-05 · Medium · Mission replay plays the scrubbed moment, not the moment it fired
- Evidence: `ModuleShell.tsx:87-89` (predicate uses `length-1`, window uses `cursor`).
- Fix: always use `const at = length - 1`.
- Test: record 10 frames, seek to 2, fire on next record, replay runs within `[at-before, at+after]` of the newest frame.
- Fixed in 040feeb.

## PLT-06 · Medium · Replay after a new run shows the wrong run
- Evidence: `src/platform/missions.ts:26-51`, `src/engine/timeline/timeline.ts:129-138` (`ReplayWindow` stores only epochs; `newRun` restarts them).
- Fix: add `run: number` to Timeline (incremented in `newRun`), store it in `ReplayWindow`; `startReplay` returns false when runs differ and the button hides (or replays from `ghostFrames()` when `run === timeline.run - 1`).
- Test: build window, `newRun()`, record, `startReplay` returns false.
- Fixed in 040feeb.

## PLT-07 · Medium · Only one fired mission is kept; the puzzle mission stays pinned
- Evidence: `ModuleShell.tsx:57,88-90,123-128,206`.
- Fix: make `fired` a queue; the card shows the head, "next" pops it. `focusMission` applies only while that mission is not done and nothing newer has fired.
- Test: two missions true on one update show both in turn; with `focusMission="a"`, firing "b" shows b's success text.
- Fixed in 040feeb.

## PLT-08 · Medium · Opening a snapshot link hands out stars and takes over predictions
- Problem: restored state that already meets a mission fires it for the recipient; restored revealed guesses block the recipient from guessing.
- Evidence: `ModuleShell.tsx:45-48,83-100`, `module-store.ts:47`, `snapshot.ts:96`.
- Fix: show restored guesses as "Their guess" and start the learner's own guesses empty. Seed the mission watcher's fired set with every mission already true at mount (no progress write). After restore, strip `#s=` with `history.replaceState` and offer "Start from your own view".
- Test: e2e opening a link whose state meets fly-off shows 0 "You earned a star."; unit test that the learner can still guess and reveal.
- Fixed in 040feeb.

## PLT-09 · Medium · A guess can be changed after the outcome is visible
- Evidence: `module-store.ts:39-43`, `PredictionCard.tsx:55-67`.
- Fix: lock the guess once `answer(state, frame)` is non-null; disable choices with a caption. Also see LIVE-11: show the guess before the start button and ask for it before the first run.
- Test: guess, advance until answer is non-null, try to switch; `aria-pressed` stays.
- Fixed in 040feeb.

## PLT-10 · Medium · Snapshot moment is a buffer position, so the restored moment is wrong
- Evidence: `ModuleShell.tsx:68-79,112`, `src/engine/model/trainer.ts` (`settle` posts on pause), `stacking-cells/scene.tsx:72`.
- Fix: store `momentEpoch` (bump snapshot to v2, keep a v1 reader); restore by waiting for a frame with `epoch >= momentEpoch` then `scrub(momentEpoch)`; save with training paused.
- Test: e2e on stacking-cells: practise, pause twice, scrub, share, open in a new page, compare `data-epoch`.
- Fixed in 040feeb (partly: the moment is stored as an epoch (snapshot v2, v1 still read); saving with training paused is not done).

## PLT-11 · Medium (suspected) · A pending snapshot seek can jump into a later run
- Evidence: `ModuleShell.tsx:71-78`.
- Fix: cancel the pending seek on the first store `update` or `newRun`.
- Test: restore with `moment: 5`, 0 frames recorded, `update`, record 6; timeline stays live.
- Fixed in 040feeb.

## PLT-12 · Medium · Share: oversize links, stale message, stale hash
- Evidence: `snapshot.ts:13,87`, `ModuleShell.tsx:154`.
- Fix: check encoded length against an exported `MAX_LINK_CHARS` in `share()` and say "too big to share"; reset `shared` on any store change; clear `#s=` on the next `update`.
- Test: a state just over the limit shows the refusal; `update` after share hides the message.
- Fixed in 040feeb.

## PLT-13 · Medium · Broken, old or other-lesson links are ignored silently
- Evidence: `LessonView.tsx:19-22`, `snapshot.ts:91`.
- Fix: `decodeSnapshot` returns `{ok:false, reason:"version"|"lesson"|"broken"|"size"}`; LessonView shows a `role=status` note (wording in platform captions).
- Test: e2e opening `#s=garbage` shows the note.
- Fixed in 040feeb.

## PLT-14 · Medium · Screen readers miss mission success, reveal results and "Link copied"
- Evidence: `MissionPanel.tsx:20-21`, `PredictionCard.tsx:37`, `ModuleShell.tsx:154-158` (status elements mount with their text). Also reported as A11Y-14.
- Fix: one persistent empty `role="status"` region in ModuleShell; write messages into it (StoryCaption already does this right, `src/ui/StoryCaption.tsx:18`).
- Test: the status node exists before the mission fires and is the same node after.
- Fixed in 040feeb.

## PLT-15 · Medium · Keyboard focus is lost after reveal, next mission, next guess
- Evidence: `PredictionCard.tsx:43-79`, `MissionPanel.tsx:33-41`, `ModuleShell.tsx:206,221-224`.
- Fix: focus a `tabIndex={-1}` heading in the card after each of these actions.
- Test: after Enter on "Show me what happens", `document.activeElement` is inside the prediction region.
- Fixed in 040feeb.

## PLT-16 · Medium · The compare split's right half is focusable but dead
- Evidence: `ModuleShell.tsx:175-182`, `src/ui/CompareSplit.tsx:51`.
- Fix: mark the right pane `inert` and `aria-hidden`, expose its label via `rightLabel`.
- Test: no focusable element in the right pane.
- Fixed in 91e51f5.

## PLT-17 · Medium · Compare halves are not on one timeline (spec: "synced to the same timeline")
- Evidence: `ModuleShell.tsx:52,179`; `docs/requirements.md:81`.
- Fix: in TimelineBar seek/play/tick, also `alternativeTimeline.scrub(mainFrame.epoch)` (or `goLive`) while comparing.
- Test: compare on, seek main to N, alternative `current().epoch <= N`.
- Fixed in 040feeb.

## PLT-18 · Medium (suspected) · Compare split clips tall scenes on phones
- Evidence: `CompareSplit.tsx:46-53`, `ModuleShell.tsx:173`.
- Fix: left pane in normal flow sets the height; right pane overlays with `absolute inset-0`.
- Test: e2e at 390px with compare on; scene region not clipped, paint canvas fully visible.
- Fixed in 91e51f5.

## PLT-19 · Medium · No way back to live training from the timeline
- Evidence: `TimelineBar.tsx:42-50`, `TimelineScrubber.tsx`, `missions.ts:71`.
- Fix: a "Back to now" button (wording in uiCaptions.timeline) when `!state.live`, calling `goLive()`; end of replay returns to live if it was live before.
- Test: seek, "Back to now", `live` is true.
- Fixed in 91e51f5.

## PLT-20 · Medium · The whole shell re-renders on every recorded frame
- Evidence: `ModuleShell.tsx:55,135`.
- Fix: move the prediction card into a `PredictionSlot` that subscribes to the timeline itself; memoise `viewProps` on `state`.
- Test: render-count test: recording 10 frames does not re-render an unchanged Scene.
- Fixed in 040feeb.

## PLT-21 · Medium (suspected) · IndexedDB upgrade or connection loss is not recovered
- Evidence: `storage.ts:12-31`.
- Fix: `onversionchange` closes and clears the cached db; `onclose` clears it; `onblocked` rejects; on `InvalidStateError` reset and retry once; race `ready` against a 2 s timeout so missions never wait on storage.
- Test: fake-indexeddb versionchange then write reopens; a never-resolving read still lets `ready` settle.
- Fixed in 5eefcc8.

## PLT-22 · Medium · Lessons cannot start from the learner's own network (spec)
- Evidence: `contract.ts:72-74`, `stacking-cells/index.ts:16-17`, `ModuleShell.tsx:45-49`; `docs/requirements.md:335`.
- Fix: contract gains `initialFrom?: (companion, initial) => S`; LessonView awaits `companionStore.ready` and applies it when there is no snapshot.
- Test: companion `[4,4]` opens stacking-cells with two layers.
- Fixed in 040feeb.

## PLT-23 · Medium · Daily puzzle: no solved state, misses midnight, no loading state
- Evidence: `PuzzleView.tsx:17-31,41`. Also LIVE-16.
- Fix: `done` from progress plus a "Solved today" caption; recompute on `visibilitychange` and at local midnight; loading status; show the date; a link back to the map; optionally list mission ids in the catalog so the lesson chunk isn't loaded.
- Test: seeded progress shows "Mission done"; fake timers across midnight change the pick.
- Fixed in b958e20.

## PLT-24 · Low · "First touch" fires on the wrong things
- Evidence: `module-store.ts:42`, `contract.ts:19`.
- Fix: `guess` does not set `touched`; `update(change, {touch:false})` for engine syncs (`scoring-every-move/scene.tsx:91`, `stacking-cells/scene.tsx:68`); decide and document whether scrubbing counts.
- Test: `guess` leaves `touched` false.
- Fixed in 040feeb.

## PLT-25 · Low · Lessons that don't train get a replay button that does nothing
- Evidence: `ModuleShell.tsx:104,129`.
- Fix: hide the button when `startReplay` would fail; optional `replay` hook for non-training modules, or document the exemption.
- Test: a mission firing on frame 0 shows no replay button.
- Fixed in 040feeb.

## PLT-26 · Low · Hand-made links can lock a prediction card
- Evidence: `snapshot.ts:69-79`, `PredictionCard.tsx:18-19,36`.
- Fix: `parseGuesses` keeps only known prediction and choice ids and requires `answer` when `revealed`.
- Test: snapshot cases.
- Fixed in 040feeb.

## PLT-27 · Low · Saves report done before commit; one failure stops all later saves
- Evidence: `storage.ts:24-31,73`.
- Fix: resolve on `tx.oncomplete`, reject on `tx.onabort`; `saving = saving.catch(() => {}).then(...)`.
- Test: after a throwing `change`, the next `change` still saves.
- Fixed in 5eefcc8.

## PLT-28 · Low · e2e/platform.spec.ts misses key flows
- Fix: add tests for guess → reveal → next guess; compare on/off repeatedly; malformed, other-lesson and old-version links; keyboard-only focus order; dark theme and reduced motion; axe scan; that `#mission=` really puts the puzzle mission on the card.
- Fixed in b385cff, fd0b009.
