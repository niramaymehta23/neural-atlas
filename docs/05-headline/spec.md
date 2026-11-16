# 05 — Headline modules

Source: requirements.md (Headline features, prompts 4–7); docs/architecture.md (DoD).
Owned: REQ-HDL-01..04.

```text
Dependencies: 03
Boundary: headline modules
```

## Scope and non-goals

Lessons Rolling downhill, Stacking cells, Who is looking at whom, Scoring every move; `engine/rl/gridworld`; `engine/pretrained/`. They prove every mechanic before the template repeats.

## Acceptance criteria

Each meets the DoD and its prompt, plus:

- **REQ-HDL-01:** a "how big a step" above the valley's stability bound fires "take steps so big the ball flies off".
- **REQ-HDL-02:** the 2D boundary morphs every step at 60 fps; adding layers updates the companion model.
- **REQ-HDL-03:** soft curved threads render within 3 s once weights are cached; dragging a word re-routes them.
- **REQ-HDL-04:** flat board-game grid; after a painted wall blocks its path, the agent re-plans within 50 episodes.

## Testing

Smoke tests for all four; seeded gridworld convergence test.

## Risks

Attention model under ~150 MB quantised; record model and licence in the plan.
