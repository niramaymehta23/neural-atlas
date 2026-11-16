# 01 — Foundation

Source: requirements.md (Design language, prompt 1); [architecture.md](../architecture.md).
Owned: REQ-FND-01..05.

```text
Dependencies: none
Boundary: scaffold, design, ui
```

## Scope and non-goals

Next.js, strict TypeScript, pnpm, stack packages, lint boundaries, static export with COOP/COEP;
`design/`, `ui/` with illustrations, `/styleguide`, `scripts/check-captions.ts`. Not visuals (02).

## Acceptance criteria

- **REQ-FND-01:** lint, typecheck, test and build pass on a clean clone; a `ui → engine` import fails lint; built site reports `crossOriginIsolated`.
- **REQ-FND-02:** ivory default and charcoal night themes; clay accent only on touchable or next items; lint bans colours, fonts and easings outside `design/`.
- **REQ-FND-03:** PaperCard, Dial, Slider, Toggle, SegmentedControl, HoverNote, StoryCaption, TermTag, MissionCard, UnderTheHoodDrawer, CommandPalette, CompareSplit are keyboard-operable, honour reduced motion, and show no glow.
- **REQ-FND-04:** `/styleguide` shows every token, primitive and the robot character in both themes.
- **REQ-FND-05:** `check-captions` rates every learner-facing string with Gemini and fails CI on a "no".

## Testing

Behaviour test per primitive; Playwright on `/styleguide`; caption check run against a deliberately jargon-heavy fixture.

## Risks

`check-captions` needs `GEMINI_API_KEY`; it skips with a warning locally and is required in CI.
