# Home map and navigation fixes (src/app, src/constellation, src/catalog, palette)

Each item: severity, the problem, evidence, the fix, the test. Error boundaries are owned by PLT-04 and ENG-06; saved-progress salvage by PLT-01; night mode by A11Y-06.

## NAV-01 · High · Locked lessons look exactly like built ones on the map
- Problem: 70 of 74 stars fly in to a "Still being drawn" page with no warning.
- Evidence: `src/constellation/StarMark.tsx:10-25,96-107`, `ConstellationScene.tsx:142-155` (never passes `lesson.load`).
- Fix: pass `built={Boolean(lesson.load)}`; unbuilt stars are hollow outline beads in `linkTone`; label line "Still being drawn" (`constellationCaptions.locked`); add it to the link's accessible name; fade instead of flying for locked stars.
- Test: HomeMap test asserts the scene receives built status; e2e hovers a locked star (label says "Still being drawn") and a built one (it doesn't).
- Fixed in 56c41fb.

## NAV-02 · High · No site navigation: lessons have no way back to the map, /puzzle is linked from nowhere
- Evidence: `src/platform/ModuleShell.tsx:142-160`, `src/platform/puzzle/PuzzleView.tsx:33-50`; the only `href="/"` is `LockedLesson.tsx:42`. Confirmed live: a lesson page has zero links.
- Fix: a shared `SiteNav` (rendered by ModuleShell, PuzzleView, LockedLesson, not-found, and on home with only puzzle + theme) holding "Back to the map", "Today's puzzle" and the theme switch (A11Y-06). Captions in `platformCaptions`. After a lesson's missions are all done, the mission card offers "Next idea" linking to `nextSuggested`.
- Test: e2e from `/learn/rolling-downhill` clicks "Back to the map" → `/`; from `/` clicks "Today's puzzle" → `/puzzle`; mastering a lesson shows a next-idea link to a built lesson.
- Fixed in 040feeb, b385cff.

## NAV-03 · High · The palette's own example search returns nothing
- Problem: placeholder suggests "sorting fruit"; that and "chatgpt" return nothing; noise ranks odd results first ("gpt" → "Good places to be").
- Evidence: `src/ui/captions.ts:5`, `src/app/CatalogPalette.tsx:8` (only title and realTerm searched).
- Fix: `PaletteItem.keywords = [realTerm, idea, playWith, worldTitle]` passed to `Command.Item`; placeholder example that matches a title ("rolling downhill"); for queries of 3 characters or fewer require word-prefix matches.
- Test: palette test: "sorting fruit" finds "Teach by showing", "chatgpt" finds a world 5 lesson; e2e types the placeholder's own example and gets at least one option.
- Fixed in 73d07d2.

## NAV-04 · Medium · The palette shows jargon on every row
- Evidence: `CatalogPalette.tsx:8` (`hint: realTerm`), `src/ui/CommandPalette.tsx:83`.
- Fix: real term is a search keyword only; show it as a hint only when the query matched the real term and not the title, or for mastered lessons.
- Test: empty query shows no real terms; "gradient descent" shows the hint beside "Rolling downhill".
- Fixed in 73d07d2.

## NAV-05 · Medium · Once every built lesson is mastered, the "next" ring points at a locked lesson
- Evidence: `src/platform/progress/progress.ts:34-37` (`?? ready[0]`).
- Fix: suggest built lessons only; when none remain, no ring and a caption "More ideas are being drawn".
- Test: all built lessons mastered → `nextSuggested` returns null.
- Fixed in 56c41fb.

## NAV-06 · Medium · The static home page has no lesson links (no JS, slow loads, crawlers)
- Evidence: `HomeMap.tsx:16-19` (`ssr:false`); star links exist only inside drei `Html`; `out/index.html` has none.
- Fix: server-render a plain lesson list (six world sections, 74 links, marked learned/next/locked) that is visually hidden once the 3D map mounts and is also the WebGL-failure fallback (ENG-12). Add `src/app/sitemap.ts` (force-static) with `/`, `/puzzle` and the 74 lessons.
- Test: Playwright with JavaScript disabled finds 74 `a[href^="/learn/"]` on `/`.
- Fixed in 56c41fb.

## NAV-07 · Medium · Tab order: 74 star links come before the heading and filter
- Evidence: `HomeMap.tsx:62-77` before `:78-91`.
- Fix: header first in the DOM (keep visual stacking with z-index); a "Skip to the map" link; stars after the filter.
- Test: first Tab from load lands on the skip link or filter, not a star.
- Fixed in 56c41fb.

## NAV-08 · Medium · Screen readers don't hear learned / next / locked
- Evidence: `StarMark.tsx:80,96-108`.
- Fix: accessible name `${title}, You have learned this | A good one to try next | still being drawn`, or `aria-describedby` to the label. Add a non-colour mark for learned stars (A11Y-15).
- Test: seed a mastered lesson; `getByRole('link', {name: /Rolling downhill, You have learned this/})`.
- Fixed in 56c41fb.

## NAV-09 · Medium · On touch, the first tap flies in; labels can't be read
- Evidence: `StarMark.tsx:83-90`; welcome copy says "Point at one".
- Fix: on `pointerType === "touch"`, first tap shows the label with an "Open" button; second tap or the button flies in. Reword the welcome to "Tap or point at one…".
- Test: Playwright `hasTouch`: first tap shows the label and URL stays `/`; second tap navigates.
- Fixed in 56c41fb.

## NAV-10 · Medium · Unknown pages show Next's default black 404
- Evidence: no `src/app/not-found.tsx`; confirmed live (black page, no way home, title "Neural Atlas").
- Fix: `src/app/not-found.tsx` in the LockedLesson style: "We couldn't find that page" + "Back to the map"; title "Not found · Neural Atlas"; captions in `platformCaptions`.
- Test: e2e `/learn/no-such-idea` → status 404, ivory background, link to `/`.
- Fixed in b958e20.

## NAV-11 · Medium (suspected) · Header covers the far groups on wide-short screens
- Evidence: `HomeMap.tsx:62-91`, `ConstellationScene.tsx:33-37,82-85`.
- Fix: offset the framing by the measured header height (`camera.setViewOffset` or target shift), or start the canvas below the header.
- Test: at 844×390 and 1366×768, `elementFromPoint` at each star's centre returns the star link.
- Fixed in 56c41fb.

## NAV-12 · Medium · Lesson code loads only after the flight lands
- Evidence: `HomeMap.tsx:70-74`, `LessonView.tsx:18`; the e2e flies to a locked lesson and allows 3000 ms (`e2e/home.spec.ts:44-51`) against REQ-CON-02's 1.2 s.
- Fix: call `lessonById(id)?.load?.()` on point and on choose.
- Test (perf project, see CI-01): click the "Rolling downhill" star; lesson h1 visible within budget and "Setting the scene…" never shows.
- Fixed in 56c41fb, b385cff.

## NAV-13 · Medium · Home renders every frame forever
- Evidence: `ConstellationScene.tsx:48-51,136,160` (`KeepFloating` invalidates each frame; `ContactShadows` frames=Infinity; 74 `Html` nodes repositioned).
- Fix: `ContactShadows frames={1}`; throttle the float to ~30 fps and pause it after 20 s without pointer movement and while `document.hidden`.
- Test: after 25 s idle, a test hook's frame counter stops increasing.
- Fixed in 56c41fb (partly: no e2e frame-counter hook yet).

## NAV-14 · Low · Cmd/Ctrl-click on a star can't open a new tab
- Evidence: `StarMark.tsx:87-90`.
- Fix: return early on meta/ctrl/shift or non-primary button before `preventDefault`.
- Test: modifier-click opens a popup at `/learn/<id>`.
- Fixed in 56c41fb.

## NAV-15 · Low · Filter and palette stay live during a flight
- Evidence: `HomeMap.tsx:46-50,81-90`.
- Fix: header `inert` while leaving; a palette selection cancels the flight timer.
- Test: after choosing a star, filter radios are inert; palette select mid-flight ends on the palette's lesson.
- Fixed in 56c41fb.

## NAV-16 · Low · The world filter resets after a lesson round trip
- Evidence: `HomeMap.tsx:36`.
- Fix: keep it in the URL (`/?world=3`, `router.replace`, Suspense for static export).
- Test: pick world 3, open a star, go Back: world 3 still pressed.
- Fixed in 56c41fb.

## NAV-17 · Low · Prerequisite lines stay full strength when other worlds dim
- Evidence: `src/constellation/Links.tsx`, `ConstellationScene.tsx:159`.
- Fix: pass `world`; split lines into chosen/other and dim the rest to the `DIMMED` opacity.
- Test: unit test on the link-partition helper.
- Fixed in 56c41fb.

## NAV-18 · Low · Resizing makes the camera glide over and over
- Evidence: `ConstellationScene.tsx:108-116`, `src/scene3d/CameraRig.tsx:35-46`.
- Fix: `CameraRig` `instant` prop; snap on aspect changes, glide only on filter or flight.
- Test: aspect-only change sets `camera.position` immediately.
- Fixed in 56c41fb.

## NAV-19 · Low (suspected) · Star labels near edges are clipped
- Evidence: `StarMark.tsx:95-98`, `ConstellationScene.tsx:166`.
- Fix: clamp the label inside the overlay or flip it below the star.
- Test: at 375px every label's box is inside the viewport.
- Fixed in 56c41fb.

## NAV-20 · Low · Missing hover scale and pointer parallax from build prompt 2
- Evidence: `StarMark.tsx:57-67`.
- Fix: spring the bead to 1.3× when shown; ±0.05 camera-target parallax from the pointer, off under reduced motion.
- Test: scale target > 1 when shown.
- Fixed in 56c41fb.

## NAV-21 · Low · After a palette jump focus lands on the palette button
- Evidence: `src/ui/CommandPalette.tsx:44-91`.
- Fix: `onCloseAutoFocus={e => e.preventDefault()}`; focus the new page's `h1` (`tabIndex={-1}`) on route change.
- Test: after a palette jump, `document.activeElement` is the lesson h1.
- Fixed in 73d07d2, b958e20.

## NAV-22 · Low · Locked page's "Good to try first" lists other locked lessons
- Evidence: `src/app/learn/[moduleId]/page.tsx:23`, `LockedLesson.tsx:28-41`.
- Fix: add "Ready to explore now" linking to the nearest built lesson (client island using `nextSuggested`).
- Test: `/learn/teach-by-showing` links to at least one built lesson.
- Fixed in 56c41fb.

## NAV-23 · Low · Returning learner's progress pops in late
- Evidence: `HomeMap.tsx:35-42`, `storage.ts:67`.
- Fix: hold the scene until `progressStore.ready` settles, capped at 300 ms.
- Test: with delayed storage the first `suggested` already reflects saved progress.
- Fixed in 56c41fb.

## NAV-24 · Low · Nothing says when progress can't be saved (private mode)
- Evidence: `storage.ts:34-43`.
- Fix: `browserStorage.persistent`; home note "This browser won't remember your progress."
- Test: `indexedDB` undefined → the note renders.
- Fixed in 5eefcc8, 56c41fb.

## NAV-25 · Low · Trailing-slash URLs 404 on the project's own server
- Evidence: `scripts/serve-static.ts:53-56`.
- Fix: 308 `/x/` → `/x`; document the host's behaviour (CI-08).
- Test: `/learn/rolling-downhill/` ends at the lesson.

## NAV-26 · Low · Catalog copy nits
- Evidence: `src/catalog/world-6.ts` "A neural network replaces the score table"; world 5 `"dog bites man" = "man bites dog"`; `world-6.ts:120` playWith `Links back to "Learning from thumbs-up"`; redundant prerequisite `smarter-ways-downhill → rolling-downhill`.
- Fix: "A thinking network replaces the score table"; "…is the same as…"; "Train a chatbot with thumbs-up"; drop the redundant edge.
- Test: `catalog.test.ts` bans `=` and "neural network" in learner fields and flags transitively redundant prerequisites.
- Fixed in 56c41fb.

## NAV-27 · Low · "The same for everyone" isn't true across time zones
- Evidence: puzzle uses the local date; `src/platform/captions.ts:31`.
- Fix: key the puzzle on the UTC date.
- Test: two time zones at one instant pick the same puzzle.
- Fixed in b958e20.

## NAV-28 · Low · Metadata gaps
- Evidence: no `src/app/icon.*`; every lesson shares the home description (`learn/[moduleId]/page.tsx:14-17`); `/styleguide*` indexable.
- Fix: `src/app/icon.svg`; `description: lesson.idea`; `robots: {index:false}` on styleguide pages.
- Test: build-output test on `out/learn/rolling-downhill.html` and styleguide `noindex`.
- Fixed in b958e20.

## NAV-29 · Low · Moving between lessons is a hard cut
- Evidence: `CatalogPalette.tsx:15`, `LockedLesson.tsx:34`; spec says flying between modules is a camera move.
- Fix: cross-fade `main` on route change via `src/app/template.tsx` (instant under reduced motion). The full flight can wait for stage 11.
- Test: during a palette jump `main` opacity dips below 1.
- Fixed in b958e20.
