<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 01 Foundation: shared plan

Spec of record: v2 design language in [requirements.md](../requirements.md); layout in [architecture.md](../architecture.md).

## Contract

### REQ-FND-01
Source: spec.md#L18
Behavior: Next.js 16, strict TypeScript 6, pnpm, stack packages (no postprocessing), static export, COOP/COEP once in `public/_headers` (served locally by `scripts/serve-static.ts`), layer table in ESLint boundaries.
Expected: `src/lint.test.ts` reports a boundaries error for a `ui → engine` import; e2e reads `crossOriginIsolated === true`.
Command: pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e

### REQ-FND-02
Source: spec.md#L19
Behavior: `design/tokens.css` owns colours, ivory default and night charcoal; clay only on touchable or next items. ESLint outside `design/` bans colour literals, easings, spring keys, `fontFamily` and `next/font`.
Expected: `src/lint.test.ts`: hex, easing and `fontFamily` in `src/ui` error; hex in `src/design` passes. e2e: ivory body by default, charcoal after switching to night.
Command: pnpm test && pnpm e2e

### REQ-FND-03
Source: spec.md#L20
Behavior: the twelve `src/ui/` primitives; Radix where one exists, else custom ARIA roles; motion via `design/motion.ts`; no glow.
Expected: a `*.test.tsx` per primitive drives it by keyboard and asserts the result; reduced motion skips animation.
Command: pnpm test

### REQ-FND-04
Source: spec.md#L21
Behavior: `/styleguide` renders every colour/type/radius/motion token, every primitive and the robot illustration, with a theme switch.
Expected: e2e visits `/styleguide`, finds each token swatch, each primitive section by heading, the robot (`role="img"` named "Robot learner"), in ivory and night, with zero console errors.
Command: pnpm build && pnpm e2e

### REQ-FND-05
Source: spec.md#L22
Behavior: rates every string from module `captions`/`missions` and `catalog` (or `--file`) with Gemini; exit 1 on a "no". No key: warn and pass locally, fail when `CI` is set.
Expected: `scripts/check-captions.test.ts` with stubbed fetch: jargon fixture `scripts/fixtures/jargon-captions.ts` fails, plain strings pass, missing key skips locally and fails under CI.
Command: pnpm test && pnpm check-captions --file scripts/fixtures/jargon-captions.ts

## Owned files
Ownership is per section in [sections/index.md](sections/index.md): config and lint, `src/design/`, `src/ui/`, `src/app/` with e2e, and `scripts/`.

## Evidence
Repo holds only `docs/`. Registry (2026-11-16): next 16.4.6, react 19.3, tailwindcss 4.3, eslint 10, eslint-plugin-boundaries 7.4, vitest 5.1, @playwright/test 1.65, radix-ui 1.8, motion 14. typescript-eslint peers `typescript <6.1`, so TypeScript 6.0 (not 7). Static export ignores `next.config` headers, hence `public/_headers` plus a local server reading it. `next/font` self-hosts fonts (COEP-safe).
Decisions: TimelineScrubber (architecture `ui/` list) is not in REQ-FND-03 and needs the stage 02 Timeline, so it is deferred. UnderTheHoodDrawer is an inline Radix Collapsible (the scene stays usable). CommandPalette takes its items as props until the catalog exists (stage 03). Gemini model defaults to `gemini-2.5-flash`, overridable by `GEMINI_MODEL`. v1 leftovers (glass, glow, ScrubbableNumber, Intuition/Mechanics/Maths) ignored.
Risks: Gemini needs network and a key, mitigated by stubbed unit tests. Rollback: drop the branch.

## Review
Verdict: pass
Reviewed: each REQ-FND maps to a test or e2e assertion; section ownership is disjoint and matches architecture.md (no engine/visuals/platform files); lint bans cover TS and CSS; TimelineScrubber is outside REQ-FND-03.
