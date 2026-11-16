<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 04 Home map: shared plan

Spec of record: v2 `docs/requirements.md` (Design language, Navigation); conventions in `docs/architecture.md`.

## Contract

### REQ-CON-01
Source: spec.md#L17
Behavior: `layoutConstellation(lessons)` places 74 stars in six world groups on a paper ground, one link per prerequisite; each group bobs by `floatOffset(world, t)` (still under reduced motion); stars take `worldTone(world)`, mastered ones clay, the `nextSuggested` one pulses with a clay ring.
Expected: layout.test.ts: 74 unique stars, groups apart, links = prerequisites; encodings test: six distinct world tones, none clay.
Command: pnpm test src/constellation src/design

### REQ-CON-02
Source: spec.md#L18
Behavior: each star has a DOM link over the canvas (hover and keyboard focus show a paper label with title and idea); click glides the camera to the star in `cameraGlide` (1.1 s) then routes to `/learn/[id]`; under reduced motion the camera stays and the map cross-fades out first.
Expected: home.spec.ts hover label, click lands on the lesson, reduced-motion fade path; motion.test.ts glide ≤ 1.2 s.
Command: pnpm build && pnpm e2e e2e/home.spec.ts

### REQ-CON-03
Source: spec.md#L19
Behavior: a world filter bar (All + six worlds) dims other worlds and reframes the camera; the existing catalog palette (everyday name + real term, stage 03) jumps from home.
Expected: HomeMap.test.tsx filter; home.spec.ts palette jump by real term.
Command: pnpm test src/constellation && pnpm e2e e2e/home.spec.ts

### REQ-CON-04
Source: spec.md#L20
Behavior: soft contact shadows on the paper ground, matte materials, no bloom; the 3D bundle loads after first paint (`next/dynamic`, `ssr: false`), the heading paints first.
Expected: home.spec.ts reads `first-contentful-paint` < 1500 ms on the static export (Lighthouse-equivalent Paint Timing).
Command: pnpm build && pnpm e2e e2e/home.spec.ts

## Owned files
Per section in [sections/index.md](sections/index.md).

## Evidence
`constellation` may import catalog, platform, scene3d, ui, design. SoftStage wraps its canvas in `role="img"`, so star links render through drei `Html` portaled into a sibling overlay. The palette already searches title and real term (`src/app/CatalogPalette.tsx`), so REQ-CON-03's palette half needs only an e2e check from home.
Decisions: learned = clay (spec risk note); `cameraGlide` shortened 1.4 → 1.1 s (one owner of camera timing, spec needs ≤ 1.2 s); FCP measured with the browser Paint Timing API in Playwright instead of a Lighthouse dependency.
Risks: floating links never settle, so e2e hovers use `force`. Rollback: drop the branch.

## Review
Verdict: pass
Reviewed: each REQ maps to a test; layer table respected; strings live in `constellation/captions.ts`, added to check-captions.
