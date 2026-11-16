# Section 01: home map

Covers REQ-CON-01..04 as one compact section (one scene, one page).

1. `design/encodings.ts`: `worldTone(world)`, `linkTone`; `design/motion.ts`: `cameraGlide` 1.1 s.
2. `constellation/layout.ts`: pure layout, links, float offset; tested.
3. `constellation/captions.ts`, `HomeMap.tsx` (filter, progress, leaving), `ConstellationScene.tsx` (lazy), `Star.tsx`, `Links.tsx`.
4. `app/page.tsx` composes heading + HomeMap.
5. `e2e/home.spec.ts`: hover, click-to-lesson, palette, reduced motion, FCP.

Done when the full command chain in the stage brief passes.
