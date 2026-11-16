# 04 — Home map

Source: requirements.md (Navigation, prompt 2); docs/architecture.md.
Owned: REQ-CON-01..04.

```text
Dependencies: 03
Boundary: home
```

## Scope and non-goals

`constellation/`, `app/page.tsx`, catalog items in the palette. Not achievement stars (11).

## Acceptance criteria

- **REQ-CON-01:** 74 ideas in six gently floating, warm-tinted groups joined by thin warm lines; learned ideas fill clay; the suggested idea pulses softly.
- **REQ-CON-02:** hover shows a paper label with everyday title and idea; click flies in within 1.2 s and opens the lesson; reduced motion cross-fades. No rotation needed.
- **REQ-CON-03:** world filter bar; the palette opens any lesson by everyday name or real term.
- **REQ-CON-04:** soft paper shadows, no bloom or glow; first contentful paint under 1.5 s.

## Testing

Playwright: hover, click-to-lesson, palette jump, reduced-motion path; Lighthouse desktop budget.

## Risks

v2 says both "glow mint" and "fill with clay" for learned ideas; this plan takes clay (it matches the palette).
