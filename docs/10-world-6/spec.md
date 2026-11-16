# 10 — World 6: reinforcement learning

Source: requirements.md (World 6, "Reinforcement learning"); docs/architecture.md (DoD).
Owned: REQ-W6-01..03.

```text
Dependencies: 09
Boundary: world 6
```

## Scope and non-goals

Remaining `engine/rl/` environments and agents, thirteen World 6 modules, `features/rl/`. Extends the gridworld from 05.

## Acceptance criteria

- **REQ-W6-01:** bandits, MDP, DQN with replay buffer, policy gradient, PPO, evolution racers, MCTS Connect Four and self-play each beat a stated reward margin with a fixed seed and budget.
- **REQ-W6-02:** each World 6 module meets the DoD; worlds are flat board-game scenes.
- **REQ-W6-03:** RL meets LLMs reuses the World 5 ranker without copying it.

## Testing

Seeded learning-curve tests per agent; World 6 smoke spec.

## Risks

DQN and PPO must train in the worker fast enough to show progress within one minute; shrink environments rather than block the UI.
