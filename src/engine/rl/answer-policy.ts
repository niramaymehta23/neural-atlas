/**
 * A chatbot's habits, trained against a judge: for each question it chooses among a few answers,
 * each described by a handful of traits (is it right, does it praise, does it agree). Its chance
 * of each answer is a softmax of its old habit for that answer plus a learned liking for each
 * trait. Training climbs the judge's average score, minus a leash that pulls it back towards its
 * old habits (a KL penalty), the way chatbots are tuned with reinforcement learning against a
 * reward model. The steps follow the exact average slope, so a run is the same every time.
 */

export type AnswerOption = {
  /** The answer's traits as numbers (1 has it, 0 does not), the same order for every answer. */
  traits: readonly number[];
  /** How likely its old self was to give this answer, as a raw score (higher: likelier). */
  habit: number;
  /** What the judge (the reward model) scores this answer. */
  reward: number;
};

export type AnswerSettings = {
  /** How far each step moves its likings. */
  stepSize: number;
  /** How strongly it is pulled back towards its old habits (0: not at all). */
  leash: number;
};

export type AnswerMoment = {
  step: number;
  /** Its learned liking for each trait. */
  likings: number[];
  /** The judge's average score of what it says, over the questions. */
  score: number;
  /** How far its habits have drifted from its old self, averaged over the questions (KL). */
  drift: number;
};

/** Its chance of giving each answer to one question, for these likings. */
export function answerChances(question: readonly AnswerOption[], likings: readonly number[]) {
  const raw = question.map(
    (option) =>
      option.habit +
      option.traits.reduce((sum, trait, index) => sum + trait * (likings[index] ?? 0), 0),
  );
  const top = Math.max(...raw);
  const weights = raw.map((value) => Math.exp(value - top));
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((value) => value / total);
}

/** The judge's average score of its answers, and how far it has drifted from its old self. */
export function judged(
  questions: readonly (readonly AnswerOption[])[],
  likings: readonly number[],
) {
  const zero = likings.map(() => 0);
  let score = 0;
  let drift = 0;
  for (const question of questions) {
    const now = answerChances(question, likings);
    const old = answerChances(question, zero);
    question.forEach((option, at) => {
      const chance = now[at] ?? 0;
      score += chance * option.reward;
      if (chance > 0) drift += chance * Math.log(chance / (old[at] ?? 1));
    });
  }
  const count = Math.max(1, questions.length);
  return { score: score / count, drift: drift / count };
}

/**
 * The run: its likings start at zero (its old self) and climb, one step at a time, the judge's
 * average score minus `leash` times the drift. Yields the start, then every `every` steps and
 * the last step.
 */
export function* trainAnswers(
  questions: readonly (readonly AnswerOption[])[],
  settings: AnswerSettings,
  steps: number,
  every = 1,
): Generator<AnswerMoment> {
  const size = questions[0]?.[0]?.traits.length ?? 0;
  const likings = new Array<number>(size).fill(0);
  const zero = likings.map(() => 0);
  const moment = (step: number): AnswerMoment => ({
    step,
    likings: [...likings],
    ...judged(questions, likings),
  });
  yield moment(0);
  for (let step = 1; step <= steps; step += 1) {
    const slope = new Array<number>(size).fill(0);
    for (const question of questions) {
      const now = answerChances(question, likings);
      const old = answerChances(question, zero);
      const mean = slope.map((_, index) =>
        question.reduce((sum, option, at) => sum + (now[at] ?? 0) * (option.traits[index] ?? 0), 0),
      );
      question.forEach((option, at) => {
        const chance = now[at] ?? 0;
        if (chance === 0) return;
        const worth = option.reward - settings.leash * Math.log(chance / (old[at] ?? 1));
        for (let index = 0; index < size; index += 1)
          slope[index] =
            (slope[index] ?? 0) +
            chance * worth * ((option.traits[index] ?? 0) - (mean[index] ?? 0));
      });
    }
    for (let index = 0; index < size; index += 1)
      likings[index] =
        (likings[index] ?? 0) +
        (settings.stepSize * (slope[index] ?? 0)) / Math.max(1, questions.length);
    if (step % every === 0 || step === steps) yield moment(step);
  }
}
