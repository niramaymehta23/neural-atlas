# 06 — Worlds 1 and 3

Source: requirements.md (World 1, World 3, "Building and training"); docs/architecture.md (DoD).
Owned: REQ-W13-01..03.

```text
Dependencies: 05
Boundary: worlds 1, 3
```

## Scope and non-goals

Remaining nine World 1 and ten World 3 modules; additions to `features/building/` and `features/inside/`.

## Acceptance criteria

- **REQ-W13-01:** each World 1 module meets the DoD with its curriculum interaction and mission.
- **REQ-W13-02:** each World 3 module does the same; architecture changes update the companion model.
- **REQ-W13-03:** weights on strings, gradient rain, ghost runs, LR finder, batch blender, init roulette, normalisation flatten, activation strip, data lens work; a feature sits in `features/` only with two consumers.

## Testing

Smoke specs for worlds 1 and 3; unit tests for any new engine maths.

## Risks

Optimisers reuses the landscape race; promote it to `features/building/` here.
