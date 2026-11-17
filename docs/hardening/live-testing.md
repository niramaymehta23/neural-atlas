# Found by using the built site

Tested on the static build of main 5a37387 at 1024×768, 375×812 (phone) and with the OS in dark mode. Items already covered elsewhere point there.

| ID | What | Owner |
|---|---|---|
| LIVE-01 | CI red since stage 03 | CI-01, CI-03 |
| LIVE-02 | Lesson pages have zero links: no way back, no next lesson | NAV-02 |
| LIVE-03 | OS dark mode ignored; no theme switch for learners | A11Y-06 |
| LIVE-04 | 404 is Next's default black page | NAV-10 |
| LIVE-05 | "Find an idea Ctrl K" pill covers content on phones and shows a shortcut on touch | A11Y-18 |
| LIVE-06 | Phone: timeline scrubber sits at the very bottom, far from the scene | below |
| LIVE-07 | Scene card stretches to the right column's height (1187px on the puppy lesson) | below |
| LIVE-08 | Pressing the start button jumps the page 290–580px down | below |
| LIVE-09 | Rolling downhill guess never unlocks | DH-01 (fixed in 0dc22eb) |
| LIVE-10 | Timeline `aria-valuetext` "Moment 49 of 49" with `aria-valuenow` 70 | below |
| LIVE-11 | The guess card sits below the fold under the start button | below |
| LIVE-12 | Walkers indistinct and stacked; valley framing | DH-08 (fixed in 0dc22eb) |
| LIVE-13 | Attention sentence overflows at 1024px | A11Y-19, ATT-11 (fixed in 7956125) |
| LIVE-14 | "zero tries so far." lowercase | QL-18 (fixed in bdc271d) |
| LIVE-15 | "Blue / Green" paint toggle unlabeled; odd mission wording | A11Y-08, MLP-10 (MLP-10 fixed in b3dc27d) |
| LIVE-16 | Puzzle: no date, no solved state, no way back | PLT-23, NAV-02 |
| LIVE-17 | Walker legend items are buttons that do nothing | A11Y-20 |

## LIVE-06 · Medium · Phone layout separates the scene from its controls and timeline
- Problem: below 768px the order is scene → dials → mission → guess → (gap) → timeline → drawer, so scrubbing or turning a dial hides the thing that changes.
- Fix: on narrow screens keep the timeline directly under the scene, and make the scene sticky (top, ~45vh) while the dial card scrolls under it; remove the blank gap above the timeline.
- Test: at 375×812 the scene and the timeline are both in view after scrolling to the dials.
- Fixed in fd0b009, 37be776.

## LIVE-07 · Medium · Scene card stretches to the right column's height
- Evidence: `src/platform/ModuleShell.tsx:162` grid uses default `align-items: stretch`.
- Fix: `items-start` on the grid (or let the scene grow to fill it on purpose).
- Test: at 1280px the scene section is no taller than its content plus padding.
- Fixed in 040feeb.

## LIVE-08 · Medium · The page jumps down after pressing the start button
- Seen on "Let them roll" (scrollY 0 → 290) and "Let it practise" (0 → 582). No code calls `scrollIntoView` or `focus()`; the likely cause is layout shift above the focused button (the tap hint is removed, the caption and timeline ghost appear) combined with scroll anchoring.
- Fix: measure with a `layout-shift` PerformanceObserver; reserve space for the caption and hint so nothing above the dock changes height; if needed `overflow-anchor: none` on the shell.
- Test: e2e presses each lesson's start button and asserts `scrollY` is unchanged and cumulative layout shift < 0.05.
- Fixed in 040feeb, fd0b009.

## LIVE-10 · Low · Timeline value and spoken text disagree
- Evidence: `src/ui/TimelineScrubber.tsx:87-123`.
- Fix: derive both from one value (`shown = Math.min(position, last)`), and set `aria-valuenow` on the Thumb explicitly if Radix lags.
- Test: re-render length 50 → 71: valuetext and valuenow agree.
- Fixed in 91e51f5.

## LIVE-11 · Medium · The guess comes after the start button
- Problem: in every lesson the "Make a guess" card is below the mission card, under the fold; learners press start first and the predict-then-reveal moment is lost.
- Fix: in ModuleShell, until the learner has guessed (or skipped), show the guess card above the dock's start button with "Guess first, then press start"; the start button stays usable but the guess is offered first. Combines with PLT-09 (lock after the outcome is visible).
- Test: on first load the guess card precedes the start button in DOM and visual order.
- Fixed in 040feeb.
