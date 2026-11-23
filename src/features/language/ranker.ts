/**
 * The preference ranker: a three-number reward model (being right, praising the person,
 * agreeing with them) fitted to picks between pairs of answers, Bradley–Terry style, one pick at
 * a time. Learning from thumbs-up (World 5) teaches it with the learner's own picks; Back to
 * chatbots (World 6) teaches it with a crowd's picks and then trains a chatbot against it.
 */

/** What an answer does, as far as the reward model can tell. */
export const TRAITS = ["correct", "flatters", "agrees"] as const;
export type Trait = (typeof TRAITS)[number];
export type Traits = Record<Trait, boolean>;
/** How much the reward model likes each trait. */
export type Weights = Record<Trait, number>;

/** One pick: the answer that won and the one it beat. */
export type Preference = { winner: Traits; loser: Traits };

export type RankerSettings = {
  /** How far one pick moves the reward model. */
  teach: number;
  /** How much it liked right answers from reading, before any pick. */
  care: number;
};

/** The reward model's score for an answer: the weights of the traits it has. */
export const scoreOf = (weights: Weights, answer: Traits) =>
  TRAITS.reduce((sum, trait) => sum + (answer[trait] ? weights[trait] : 0), 0);

/**
 * The reward model after `picks`, in order: each pick moves the weights towards the winner's
 * traits and away from the loser's, further when the model had the pair the wrong way round.
 */
export function learnFromPicks(
  picks: readonly Preference[],
  { teach, care }: RankerSettings,
): Weights {
  const weights: Weights = { correct: care, flatters: 0, agrees: 0 };
  for (const { winner, loser } of picks) {
    const gap = scoreOf(weights, winner) - scoreOf(weights, loser);
    const wrongness = 1 - 1 / (1 + Math.exp(-gap));
    for (const trait of TRAITS)
      weights[trait] += teach * wrongness * (Number(winner[trait]) - Number(loser[trait]));
  }
  return weights;
}

/** The answer the reward model scores highest (the first, on a tie). */
export function bestAnswer(weights: Weights, answers: readonly Traits[]): number {
  let best = 0;
  answers.forEach((answer, at) => {
    if (scoreOf(weights, answer) > scoreOf(weights, answers[best] ?? answer) + 1e-9) best = at;
  });
  return best;
}
