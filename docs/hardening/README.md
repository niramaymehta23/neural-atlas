# Hardening pass after stage 05

A full audit of stages 01–05 (main at 5a37387, 2026-11-17): six code reviews by area plus hands-on testing of the built site on desktop, phone size and OS dark mode. Every item has the problem, where it is in the code, the fix and the test that proves it.

| File | Area | Items |
|---|---|---|
| engines-ci-hosting.md | CI, engines, deploy, repo | 22 |
| platform.md | Lesson shell, saving, links, missions, guesses, puzzle | 28 |
| home-navigation.md | Home map, navigation, palette, catalog, 404 | 29 |
| design-accessibility.md | Contrast, colour-blind cues, keyboard, touch, theme | 29 |
| lessons.md | The four lessons | 55 |
| live-testing.md | Found by using the site | 17 (5 new, 12 point elsewhere) |

By severity: 1 blocker, 22 high, 69 medium, 47 low. A few entries are cross-references, so there are about 165 distinct fixes.

## Rules for whoever fixes these

- An item is done when its test exists and passes, and the full done-command passes: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm format:check`.
- Fix the cause, not the symptom: no loosened thresholds, skipped tests or `// eslint-disable` to get green.
- Learner-facing words go in captions files, and the fixing session reviews them against "would a smart 12-year-old follow this?" (no automated check).
- Mark each item fixed in its file with the commit that fixed it, so this folder stays the record.
- Spec gaps (DH-07, MLP-07, ATT-19, QL-17, NAV-20) are built, not deferred, unless the owner says otherwise.

## Order

Later stages copy the shape of the stage 05 lessons and the shell, so this pass runs before stages 06 and 07.

1. **H1 — CI, build and hosting** (engines-ci-hosting.md: CI-01..05, HOST-14..17, REPO-18..22). Touches only `.github/`, `e2e/` config and helpers, `scripts/`, `playwright.config.ts`, `package.json`, `public/_headers`, `.gitignore`, docs. Gets CI green first so every later fix is checked.
2. **H2 — Shell, design system and navigation** (platform.md, home-navigation.md, design-accessibility.md, live-testing.md LIVE-06..11, plus ENG-06, ENG-07, ENG-12). One session: these all meet in `ModuleShell`, `src/ui`, `src/design` and `src/app`.
3. **H3 — Lessons**, after H2 merges, as two parallel sessions with no shared files:
   - **H3a** Rolling downhill + Stacking cells (DH-*, MLP-*, ENG-08..11).
   - **H3b** Who is looking at whom + Scoring every move (ATT-*, QL-*, ENG-13).

H1 and H2 can run at the same time; they share no files except `docs/architecture.md` (each adds its own section).

## Decisions for the owner

1. **Host** — Cloudflare Pages or Netlify (both honour `_headers`; Vercel needs extra config; GitHub Pages can't run the attention and training lessons). Connecting the account needs you.
2. **Night mode default** — the spec says ivory by default. A11Y-06 makes the site follow the OS setting when the learner hasn't chosen. Say if you'd rather keep ivory as the default and only add the switch.
3. **Licence for the repo** — decided: MIT (`LICENSE`). Bundled third-party files keep their own licences (see `public/models/`).
