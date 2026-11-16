# 12 — Phone and accessibility pass

Source: requirements.md (Responsiveness, sequence step 12); [architecture.md](../architecture.md).
Owned: REQ-PA-01..03.

```text
Dependencies: 11
Boundary: phone, a11y
```

## Scope and non-goals

Layout-only fixes across `src/`; no per-device logic forks.

## Acceptance criteria

- **REQ-PA-01:** all 74 modules work at 375 px in the stacked card flow.
- **REQ-PA-02:** touch scrub, paint and pinch zoom work on tablet.
- **REQ-PA-03:** zero serious or critical axe issues on every route; reduced motion makes particles static and camera moves cross-fade.

## Testing

Playwright mobile and touch-emulated suites; axe on every route.

## Risks

Most should already hold from built-in conventions; this pass fixes stragglers only.
