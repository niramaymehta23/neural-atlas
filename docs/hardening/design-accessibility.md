# Design system and accessibility fixes (cross-cutting)

Contrast ratios were computed from the token values (day: paper #FAF9F5, card #F5F2EC, inset #E3DACC; night: paper #1F1E1D, card #282726, inset #363432). Night text contrast passes everywhere; the failures are in day theme.

## A11Y-01 · High · Day secondary text (#87867F) fails AA
- Ratios: 3.47 on paper, 3.27 on card, 2.64 on inset (needs 4.5).
- Where: unselected segmented options (theme switch, home filter, valley and brush pickers), TermTag, palette trigger and placeholder, lesson opening paragraph, card eyebrows, "tries so far", drawer body.
- Evidence: `src/design/tokens.css:16,28`, `src/ui/SegmentedControl.tsx:46`, `src/ui/TermTag.tsx:11`, `src/ui/CommandPalette.tsx:46,70`, `src/platform/ModuleShell.tsx:145`, `src/ui/MissionCard.tsx:28`, `src/platform/PredictionCard.tsx:34`, `src/ui/UnderTheHoodDrawer.tsx:52`, `src/constellation/HomeMap.tsx:80`, `src/ui/CompareSplit.tsx:56,59`.
- Fix: keep #87867F as a swatch; set the day semantic `--ink-soft` to about #5F5E58 (6.17 / 5.82 / 4.70); use `text-ink` on `bg-inset`.
- Test: a vitest that resolves every semantic text/surface pair in both themes (including oklab mixes) and asserts ≥4.5; axe colour-contrast in e2e (A11Y-29).
- Fixed in 9eb88fe.

## A11Y-02 · High · Clay used as text fails contrast in day theme
- Ratios: 2.96 on paper, 2.80 on card.
- Where: "Need a hint?", "Show me what happens", "Watch why it happened", "On to the next…", "Let it practise"/"Let it learn"/"Let them roll", selected word chip, locked-page links, star label status lines.
- Evidence: `MissionCard.tsx:35`, `MissionPanel.tsx:28,37`, `PredictionCard.tsx:47,73`, `scoring-every-move/controls.tsx:68`, `stacking-cells/controls.tsx:66`, `rolling-downhill/controls.tsx:51`, `who-is-looking-at-whom/threads.tsx:123`, `LockedLesson.tsx:13`, `StarMark.tsx:103`.
- Fix: add `--accent-ink` (day ≈ #A8502F, 5.17/4.88; night = clay) as `text-accent-ink`; keep clay for fills; lint-ban `text-accent`.
- Test: the token contrast test and axe.
- Fixed in 9eb88fe.

## A11Y-03 · Medium · Focus ring under 3:1 in day theme
- Evidence: `tokens.css:103-106` (2px clay outline: 2.96 / 2.80).
- Fix: outline in `--accent-ink` in day theme, or a clay ring plus ink outer ring (no glow).
- Test: token test asserts focus colour ≥3:1 on paper, card and inset in both themes.
- Fixed in 9eb88fe.

## A11Y-04 · High · Toggle "off" state is nearly invisible
- Evidence: `src/ui/Toggle.tsx:21,23` (sand track 1.25–1.31; knob 1.31); used by "Compare side by side".
- Fix: unchecked track gets a 1px darker ink-soft border; knob gets an ink hairline; a second on/off cue (check glyph or visible On/Off text).
- Test: Toggle test asserts the unchecked border; axe non-text contrast on /styleguide.
- Fixed in 91e51f5.

## A11Y-05 · Medium · Slider, Dial and timeline indicators under 3:1
- Evidence: `src/ui/Slider.tsx:44,45,50`, `src/ui/Dial.tsx:85,95,106`, `src/ui/TimelineScrubber.tsx:115`.
- Fix: draw range and arc in ink; outline thumbs and pointer in ink; Dial pointer radius ≥5.
- Test: token pairs covered by the contrast test; styleguide visual snapshot.
- Fixed in 91e51f5.

## A11Y-06 · High · Night mode is unreachable and the OS dark preference is ignored
- Evidence: ThemeSwitch only on `src/app/styleguide/**`; `src/design/theme.ts:11,28-32` reads only localStorage; no `storage` listener. Confirmed live (OS dark → ivory, no switch).
- Fix: ThemeSwitch in SiteNav (NAV-02). When nothing is saved, follow `prefers-color-scheme` (the spec says ivory by default; following the OS is the decision recorded here — revert if the owner disagrees). Listen to `storage` events for cross-tab sync.
- Test: `emulateMedia({colorScheme:'dark'})` → `html[data-theme=night]` before hydration; switch visible on `/` and `/learn/*`.
- Fixed in 1c68379.

## A11Y-07 · High · Good/bad and weight sign are colour only
- Problem: bowl vs lava, square value tints, and weight signs are sage vs rose only (luminance 1.30; ΔE 4.4 under deuteranopia). Edges at 0.75 opacity are about 2:1.
- Evidence: `src/design/encodings.ts:33-35,89-111`, `src/visuals/Board.tsx:103-114`, `src/visuals/Edge.tsx:20-24`, `scoring-every-move/scene.tsx:128-129`.
- Fix: a cut-paper glyph per special tile (`tileMark(kind)`: bowl, lava, treat, wall hatch); dashed strokes for negative weights; a +/− mark on value tints; edge opacity 1; non-best wedges ≥0.6.
- Test: Board renders a distinct `data-mark` per kind; negative Edge has a dasharray; a deuteranopia-emulated screenshot.
- Fixed in 91e51f5.

## A11Y-08 · Medium · Flower groups are named by colour and told apart by colour only
- Evidence: `stacking-cells/captions.ts:24-28`, `src/data/PaintCanvas.tsx:105-115`, `encodings.ts:47-60`. Confirmed live: an unlabeled "Blue / Green" toggle among the dials.
- Fix: a shape per group (`classMark`: circle, triangle, square); brushes named by the thing ("Daisies" / "Tulips") with a shape swatch and a visible label "Plant:"; points stroked in ink.
- Test: PaintCanvas renders different shapes for groups 0 and 1.
- Fixed in 91e51f5.

## A11Y-09 · High · Dials can only be changed by dragging (WCAG 2.5.7)
- Evidence: `src/ui/Dial.tsx:49-76`.
- Fix: click/tap on the arc sets the value from the angle; optionally −/+ buttons.
- Test: pointerdown/up on the arc changes the value; Playwright click changes `aria-valuenow`.
- Fixed in 91e51f5.

## A11Y-10 · Medium · Word reordering is drag or a hidden shortcut only
- Evidence: `threads.tsx:59-63,111-114`, `who-is-looking-at-whom/captions.ts:20-21`.
- Fix: move-left/right buttons on the focused chip; mention the keys in the caption; `aria-keyshortcuts`.
- Test: clicking the move buttons reorders; `aria-keyshortcuts` present.
- Fixed in 91e51f5.

## A11Y-11 · Medium · Choosing a start point on the valley is pointer only
- Evidence: `src/scene3d/LossLandscape.tsx:89-99`, `rolling-downhill/scene.tsx:73-80`, `SoftStage.tsx:21`.
- Fix: a focusable drop-spot control (arrows move a ring, Enter drops).
- Test: Tab to it, arrows, Enter; start changes and a run begins.
- Fixed in 91e51f5.

## A11Y-12 · Medium · Paintable board and garden give screen readers nothing
- Evidence: `Board.tsx:62-101,113` (`role:"application"` overrides `img`, no instructions, cursor starts nowhere, 1-unit highlight), `PaintCanvas.tsx:60-88,117-127`.
- Fix: cursor starts on the piece on focus; 3px ink+clay ring; live line "Row 2, square 3: lava"; key instructions via `aria-describedby`; garden announces "Planted a daisy" and the cursor position.
- Test: focus, ArrowRight, Enter → live text names the square and kind; `onPaint` gets the right index.
- Fixed in 91e51f5.

## A11Y-13 · Medium · Lesson visuals have no text version of what changed
- Evidence: `threads.tsx:81-87`, `src/visuals/NetworkView.tsx:40-44`, `src/visuals/Chart.tsx:33-36`, `src/data/DecisionField.tsx:51-57`, `SoftStage.tsx:21`.
- Fix: a per-lesson polite live description in `captions.ts` (e.g. "'it' looks most at 'dog'"; "Getting better over the last few tries").
- Test: scene test asserts the description updates after `update`.
- Fixed in 040feeb (partly: the shell's polite scene description (`describe` in the lesson contract, `SceneDescription`) is built; each lesson's own description is left to H3).

## A11Y-14 · Medium · Status regions mount with their text — same as PLT-14, fix there.
- Fixed in 040feeb.

## A11Y-15 · Medium · Star status is colour and motion only; focus is lost when the filter dims a focused star
- Evidence: `StarMark.tsx:59,78-91,94-107`, `ConstellationScene.tsx:145-149`.
- Fix: names per NAV-08; a tick bead for learned; move focus to the filter before unmounting a focused star.
- Test: changing the filter while a star is focused leaves focus on the filter.
- Fixed in 56c41fb.

## A11Y-16 · High · Segmented pickers overflow the dials card; pages scroll sideways at 320px
- Evidence: `SegmentedControl.tsx:37` (no wrap), `ModuleShell.tsx:162,197`, `rolling-downhill/controls.tsx:42-47`, `scoring-every-move/controls.tsx:58-63`.
- Fix: `flex-wrap`; more than 3 options or a narrow dock renders a vertical radio list.
- Test: the four lessons at 1280 and 320px: nothing in the dock overflows its card; page `scrollWidth <= innerWidth`.
- Fixed in 91e51f5.

## A11Y-17 · Medium (suspected) · Home can't scroll at 400% zoom or on short landscape phones
- Evidence: `HomeMap.tsx:60,78-91` (`h-dvh overflow-hidden`).
- Fix: below ~480px tall use `min-h-dvh` flow layout, map below the header.
- Test: at 640×360 and 320×256 the filter and a star link are visible and unobstructed.
- Fixed in 56c41fb.

## A11Y-18 · Medium · The fixed "Find an idea" pill covers content
- Evidence: `src/app/CatalogPalette.tsx:13`. Confirmed live on phone (covers the drawer chevron and cards) and it shows "Ctrl K" on touch devices.
- Fix: move the trigger into SiteNav (NAV-02); hide the shortcut hint on coarse pointers.
- Test: on every page and at 390px, no focused element's rect intersects the trigger; no shortcut text on touch.
- Fixed in 73d07d2.

## A11Y-19 · Medium · Attention word chips overlap and overflow
- Evidence: `threads.tsx:24,79,104-123`. Confirmed live: the default 10-word sentence overflows the panel at 1024px (672 vs 568px) and arcs clip at the top.
- Fix: size slots from measured chip widths and fit the default sentence without scrolling at ≥768px; give arcs headroom.
- Test: a 12-word sentence with long words: no two `[data-word]` boxes intersect, also with text-spacing overrides; default sentence has no horizontal scroll at 1024px.
- Not fixed in H2: left to H3 with ATT-11.
- Fixed in 7956125.

## A11Y-20 · Medium · HoverNote is unreachable on touch; walker legend buttons do nothing
- Evidence: `src/ui/HoverNote.tsx:16-27`, `rolling-downhill/scene.tsx:15,81-96`. Walkers are ink/sage/grey (sage vs grey ΔE 4.8 for colour-blind learners).
- Fix: HoverNote opens on click/tap (Popover); each walker gets a distinct marker shape and trail dash, matched in the legend.
- Test: click shows the note; `hasTouch` tap shows it.
- Fixed in 91e51f5.

## A11Y-21 · Low · Palette search input has no focus outline
- Evidence: `CommandPalette.tsx:62` (`outline-none`).
- Fix: visible focus style on the field.
- Fixed in 73d07d2.

## A11Y-22 · Low · Compare divider focus ring clipped; valuetext hard-coded English
- Evidence: `CompareSplit.tsx:43-44,73,80`.
- Fix: ring on the knob; template in `uiCaptions.compare.valuetext`.
- Fixed in 91e51f5.

## A11Y-23 · Low · Learner-facing strings live outside captions files
- Evidence: `src/design/copy.ts:6-42`, `CompareSplit.tsx:73`, `src/app/layout.tsx:9-10`, `src/app/puzzle/page.tsx:4`, `src/app/learn/[moduleId]/page.tsx:16`, `CommandPalette.tsx:27-28`.
- Fix: move them into captions files, where every learner-facing string is reviewed by hand against the "smart 12-year-old" test (no jargon, no formulas or raw numbers on the main screen, the real term only as the end tag); a lint/vitest scan bans JSX text and literal `aria-*`/`title`/metadata strings outside captions files.
- Fixed in b958e20.

## A11Y-24 · Low · Clay used on untouchable things
- Evidence: puppy piece `Board.tsx:130`, chart marker `Chart.tsx:68`, focused threads `threads.tsx:96`, mission dot `MissionCard.tsx:30`, robot antenna `Robot.tsx:28`, star label text `StarMark.tsx:103`.
- Fix: puppy in ink (or a small dog illustration); marker and threads in ink/sky; dot in ink-soft.
- Test: a scan flagging accent classes in visuals and scene files, with an allowlist.
- Fixed in 56c41fb.

## A11Y-25 · Low · Shadow rule misapplied
- Evidence: `StarMark.tsx:98` (tooltip lifted shadow), `threads.tsx:104-115` (dragged chips have none).
- Fix: drop the tooltip shadow; lifted shadow on chips while dragging.
- Fixed in 91e51f5.

## A11Y-26 · Low (suspected) · 3D colours drift from tokens
- Evidence: `SoftStage.tsx:22-24` (default ACES tone mapping), `ConstellationScene.tsx:160` (ContactShadows default black).
- Fix: `<Canvas flat>`, tune lights; ContactShadows colour from the ink token.
- Test: pixel sample of a learned star within ΔE 5 of clay.
- Fixed in 91e51f5, 56c41fb (partly: the pixel colour-difference test is not written).

## A11Y-27 · Low · Reduced motion removes the flow cue instead of showing a static gradient
- Evidence: `src/visuals/FlowParticles.tsx:36,61`; `docs/requirements.md:98`.
- Fix: static sky gradient weighted by activity per path.
- Fixed in 91e51f5.

## A11Y-28 · Low · Touch targets under 44px
- Evidence: segmented items ~32px, choice pills ~30px, word chips ~28px, timeline buttons 36px, slider thumb 20px, text-link triggers 20px.
- Fix: `min-h-11` on coarse pointers; 44px invisible hit areas on thumbs.
- Test: at 390px every interactive box ≥44×44 (allowlist).
- Fixed in 91e51f5 (partly: an e2e check of every 44px target is not written).

## A11Y-29 · Medium · No automated accessibility checks exist
- Fix: add `@axe-core/playwright`; matrix spec pages × {ivory, night} × {normal, reduced motion} × {1280, 320}; the token-contrast vitest. They must fail on today's main, proving they catch A11Y-01..05.
- Fixed in fd0b009.
