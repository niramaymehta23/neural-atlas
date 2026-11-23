<!-- FORGE_META
{"artifact_type": "compact_plan", "depth_mode": "lean", "source": "spec.md"}
END_FORGE_META -->
# Stage 10 World 6 (Learning by trying): shared plan

Spec of record: `docs/requirements.md` (World 6 table, "Reinforcement learning" library);
`docs/architecture.md` (DoD and every hand-over); `docs/hardening/`.

## Contract

### REQ-W6-01
Source: spec.md#L15
Behavior: bandits, the worked-out board (MDP), DQN with a replay buffer, policy gradient, PPO,
evolution racers, MCTS Connect Four and self-play each beat a stated reward margin with a fixed
seed and budget.
Expected: one seeded learning-curve test per agent in `src/engine/rl/*.test.ts`, each naming its
seed, budget and margin in the test title and asserting it; the margins are listed in the
architecture hand-over.
Command: pnpm vitest run src/engine/rl

### REQ-W6-02
Source: spec.md#L16
Behavior: all thirteen unbuilt World 6 lessons meet the DoD; every world is a flat board-game
scene (2D SVG, cut-paper look, no 3D).
Expected: a unit test per lesson (missions, near misses, guess, `parseState` clamping,
`describe`, the star in the shell); `e2e/world-6.spec.ts` smoke; one `e2e/w6-<id>.spec.ts` per
lesson (an interaction, the star, the exact link round-trip); World 6 in `e2e/a11y.spec.ts`.
Command: pnpm vitest run src/modules/w6-reinforcement && E2E_PORT=4210 pnpm e2e e2e/world-6.spec.ts e2e/w6-

### REQ-W6-03
Source: spec.md#L17
Behavior: "Back to chatbots" reuses World 5's reward model (the ranker) without copying it.
Expected: the ranker maths moves to `src/features/language/ranker.ts`; Learning from thumbs-up
re-exports its old names from there with unchanged behaviour (its tests unchanged and green);
Back to chatbots imports the same module. No second copy of `weightsOf`.
Command: pnpm vitest run src/modules/w5-transformers/learning-from-thumbs-up src/modules/w6-reinforcement/back-to-chatbots

## Shared foundation (built first, on `stage-10-world-6`)

- `src/engine/rl/mdp.ts`: the board worked out exactly. `transitions` (slips split half to each
  side, like `gridworld.step`), `moveValue(s)`, `bestMoveFrom`, `sweep`, `valueSweeps` (all zero
  first, one square further per sweep), `solve` → `{ values, policy, sweeps }`, `policyOf`,
  `goalChance` (chance a plan ever reaches the bowl), seeded `walk`. Rules: `{ slip, stepReward,
  care, rewards? }`. Measured: at slip 0.3 the start square beside the lava bumps the edge rather
  than step along the lava.
- `src/features/rl/PolicyArrows.tsx` (four wedges per square, length = share, favourite in ink;
  a `Board` overlay) and `board-values.ts` (`boardGlow(values, tiles, { scale, strength })` →
  `floorTones` + `floorValues` for `Board`; `glowScale`).

## Sections

| Section | Lessons | Engine (new, in `src/engine/rl/`) | Builder |
|---|---|---|---|
| 01 bandits | treats-and-tricks, new-or-favourite | `bandit.ts` | agent, worktree |
| 02 boards | the-game-board, now-vs-later, good-places-to-be | uses `mdp.ts` | agent, worktree |
| 03 deep | a-brain-for-the-game, player-and-coach | `tiny-net.ts`, `catch-game.ts`, `dqn.ts`, `ppo.ts`, `agent-worker.ts` + host/protocol/client; `features/rl/use-agent-practice.ts` | agent, worktree |
| 04 habits and racers | nudging-habits, survival-of-the-fittest | `policy-gradient.ts`, `racers.ts` | agent, worktree |
| 05 games | thinking-ahead, practising-against-yourself | `connect-four.ts`, `mcts.ts`, `sticks.ts` | agent, worktree |
| 06 rewards and chatbots, integration | loopholes, back-to-chatbots; catalog, smoke, a11y, hand-over | `reward-design.ts`, `answer-policy.ts`; `features/language/ranker.ts` | main session |

Each section owns only its lesson folders, its engine files, its `e2e/w6-<id>.spec.ts` files and
its own `load` lines in `src/catalog/world-6.ts`. `src/features/rl/` gains a file only when two
lessons use it, inside one section (03's practice hook) or added by the main session.

## Lesson designs

Every lesson: `model.ts` (pure state, frames, run), `captions.ts` (every word), `missions.ts`,
`predictions.ts`, `scene.tsx`, `controls.tsx`, `drawer.tsx` (Mechanics and The maths),
`index.ts` (`defineModule`, `parseState`, `describe`, `compare` where a setting has a clear
alternative), one unit test. Mission thresholds and guess answers rest on **measured** facts,
each a named constant beside the model with the measurement in its comment and a test.

1. **Treats and tricks** (RL; puppy learns tricks from treats). The puppy does one of four
   tricks each round (sit, spin, paw, roll over), drawn from its habits (softmax preferences,
   seeded per round). You tap "Give a treat" or "No treat"; a treat nudges that trick up
   (gradient-bandit with a running average). "A trainer gives treats for …" plays ten rounds by a
   rule. Dials: "How big a treat" (step), "How playful" (temperature). Bars show how often it
   does each trick (bar length, trick picture and name; no numbers). Mission "Reward the wrong
   trick": you asked for sit, but it does another trick most of the time after you rewarded that
   one. Guess: "Never give a treat: will it settle on one favourite?" (answer: it keeps mixing,
   because no reward means nothing to learn). State: `treats: (0|1)[]` (capped), dials,
   `attempt`. Trains (one frame per round).
2. **New or favourite?** (bandits). Five flat slot machines with hidden win chances (seeded).
   You play them yourself (each pull's outcome is fixed by seed and pull number); then race two
   bots: "Curious sometimes" (epsilon-greedy) and "Hopeful about the unknown" (UCB) over a
   budget. Dials: "How curious" (epsilon), "How many pulls". Mission "Never try anything new":
   curiosity at zero, the bot sticks with a machine that is not the best (measured seed). Guess:
   who ends with more wins, the bot that never explores or the one that explores a little.
   Trains (recorded run, a frame per ten pulls).
3. **The game board** (MDP). Paint floor, wall, lava, treat, bowl on a 7×5 board; dials "How
   slippery" and "How tiring each move". `mdp.solve` draws the best move per square
   (PolicyArrows) and a seeded "Try a walk" shows slips. Mission "Make a trap square": a square
   the puppy can reach where even the best move ends in the lava more often than at the bowl
   (`goalChance` < ½ and > 0 reachable), measured on a narrow lava bridge at high slip. Guess:
   "Make the floor very slippery: will the best way home get longer or stay the same?"
4. **Now vs later** (discounting). A small treat-bowl near the start and a big bowl far away
   (goal reward set through `rules.rewards`). The telescope dial "How far ahead it cares" (care)
   and "How big the far prize". The plan flips from near to far as care grows. Mission "Make it
   care only about this second": care at its bottom, the plan reaches neither prize. Guess: at
   "right now", near treat or far bowl?
5. **Good places to be** (value function). `valueSweeps` played back on the timeline (one frame
   per sweep); `boardGlow` warms the board from the bowl outwards. Dials: "How far ahead it
   cares", "How slippery"; paint the board. Mission "Hide the reward entirely": no bowl, so the
   glow never comes. Guess: "After three spreads, is the puppy's corner warm yet?" (not yet: the
   glow moves one square per spread).
6. **A brain for the game** (DQN). Catch-the-fruit arcade on a small flat grid (basket left /
   stay / right). A tiny network (`tiny-net.ts`: inputs → tanh hidden → three move scores)
   replaces the score table; a replay memory feeds it mixed old games; a target copy steadies it.
   Trains in the agent worker, shows progress within a minute (catch rate line). Dials: "How
   much it remembers" (memory size), "How fast it learns". Mission "Take away its memory of past
   games": memory at its smallest, practice stalls (measured). Guess about the no-memory run.
7. **Nudging habits** (policy gradient). A softmax policy per square on the board, nudged by
   REINFORCE after each batch of tries; the arrow field bends over time (PolicyArrows shares =
   move chances). Dials: "How hard each nudge", "Tries per nudge". Mission "Nudge so hard it goes
   wild": the biggest nudge locks onto a bad habit (measured: lower success than the default).
   Recorded run in slices.
8. **Player and coach** (actor-critic / PPO). Same board; the player's arrows and the coach's
   glow side by side. PPO with a clipped change, trained in the agent worker. Dials: "How small
   the changes stay" (clip), "Study rounds per batch". Mission "Remove the small-changes safety
   rail": no clip and many study rounds make the player's score fall after rising (measured).
9. **Survival of the fittest** (evolution strategies). Draw a racetrack (paint road squares,
   presets too); a population of cars with tiny brains (three feelers → steering) drives it,
   the best breed with mutation each generation. Dials: "How much each child changes", "Cars per
   generation". Mission "Mutate so much nothing improves". Recorded run in slices.
10. **Thinking ahead** (MCTS). Flat Connect Four, you against it. It imagines futures (seeded
    MCTS, fixed count of imagined games, worked in ≤ 6 ms slices or a worker; never blocking a
    frame); the tree bloom shows its top choices (thickness = how often imagined). Dial "How many
    futures it imagines" (bottom = one move ahead: it only checks its own next move) and "How
    long each imagined game runs". Mission "Let it look one move ahead": in the ready-made
    puzzle, the one-move-ahead player misses your threat and you win.
11. **Practising against yourself** (self-play). A flat stick game (take one, two or three; the
    one who takes the last stick wins). Two copies learn by playing each other (tabular,
    seeded). Wins chart. Dials: "How many practice games", "How curious". Mission "Freeze one so
    the other learns a cheap trick": frozen partner, the learner beats it but loses to a fresh
    tester (measured).
12. **Loopholes** (reward hacking). A tidy-up robot on a small board; you write its reward with
    switches and dials; `reward-design.ts` works out the best plan exactly (value iteration over
    square × carrying × done). Three loopholes it can find: pacing to collect "closer to the box"
    treats, picking up and dropping the same toy, and ending the day early in the puddle when
    moves cost too much. Mission "Find three loopholes" (`found` kept in state). Calm, honest.
13. **Back to chatbots** (RL + LLMs). A crowd's picks (mostly honest, a little swayed by praise)
    train World 5's reward model (`features/language/ranker.ts`); then the chatbot's habits are
    trained against it with policy-gradient steps and a leash back to its old self (KL penalty).
    Dials: "How long it trains", "How tightly it stays near its old self". Mission "Over-train
    it until it only flatters". Calm, honest; links back to Learning from thumbs-up.

## Rules every lesson meets from day one

`parseState` clamps every number and caps every list; `describe()`; the shell's error boundary
gets engine failures thrown from render; links replay exactly (seeded, progress counter in
state, no wall-clock); no colour-only cues; keyboard and touch (holds before painting, swipes
scroll); reserved space so nothing jumps; 320 px phone layout; day and night contrast through
tokens; reduced motion (show the end); a plain failure message; at least two plain-named dials;
nothing heavier than a few ms per frame or key press on the main thread; a run that restarts
on a dial change starts cleanly; unit waits for training or workers use ~10 s timeouts with the
test limit raised to match.

## Decisions

- No external model files: every agent is seeded TypeScript in `src/engine/rl/`.
- DQN and PPO share one agent worker (`agent-worker.ts`, typed protocol, run numbers, `connect`
  swap for in-process tests), modelled on `engine/language/writer-*`.
- The ranker moves to `features/language/ranker.ts` (it is World 5's preference ranker in the
  feature library); World 5's lesson keeps its exports.
- Once World 6 is built every lesson is built: tests that used "Treats and tricks" as a locked
  example change to unit-level fakes; the main session handles them.

## Risks

- DQN / PPO learning is fragile: environments are shrunk until the seeded margin holds with a
  clear gap, and the measured constants are pinned by tests.
- MCTS on the main thread could block: fixed-count search in slices, checked under 4× CPU
  throttling.

## Evidence

Read: architecture.md (all), hardening README and lessons, scoring-every-move, learning-from-
thumbs-up, forger-vs-detective, use-recorded-run, writer worker, Board, encodings, contract.

Rollback: new files, plus the World 6 `load` lines, the ranker move (World 5 re-exports), the
locked-example test changes, one docs section.

## Review
Verdict: pass (lean, self-reviewed against the DoD and the hardening list).
