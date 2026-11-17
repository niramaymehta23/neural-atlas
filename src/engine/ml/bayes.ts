/** One message the detective learns from. */
export type Example = { words: readonly string[]; spam: boolean };

export type Detective = {
  /** How often each word appeared in spam and in ordinary messages. */
  counts: Map<string, { spam: number; ham: number }>;
  spamWords: number;
  hamWords: number;
  spamMessages: number;
  hamMessages: number;
  /** Words seen at all (the vocabulary). */
  vocabulary: number;
  /** Pretend-count added to every word (Laplace smoothing), so an unseen pairing is not "never". */
  smoothing: number;
};

/** Lower-case words of a message: letters, digits and apostrophes inside words. */
export function wordsOf(text: string): string[] {
  return (text.toLocaleLowerCase("en-GB").match(/[\p{L}\p{N}]+(?:'[\p{L}]+)*/gu) ?? []).slice();
}

/** Learns word counts (multinomial naive Bayes). */
export function trainDetective(examples: readonly Example[], smoothing: number): Detective {
  const counts = new Map<string, { spam: number; ham: number }>();
  let spamWords = 0;
  let hamWords = 0;
  let spamMessages = 0;
  for (const example of examples) {
    if (example.spam) spamMessages += 1;
    for (const word of example.words) {
      const entry = counts.get(word) ?? { spam: 0, ham: 0 };
      if (example.spam) {
        entry.spam += 1;
        spamWords += 1;
      } else {
        entry.ham += 1;
        hamWords += 1;
      }
      counts.set(word, entry);
    }
  }
  return {
    counts,
    spamWords,
    hamWords,
    spamMessages,
    hamMessages: examples.length - spamMessages,
    vocabulary: counts.size,
    smoothing,
  };
}

/**
 * How much one word points to spam: log P(word | spam) − log P(word | ordinary). Positive points
 * to spam, negative to ordinary; a word never seen in either is 0 (no clue).
 */
export function clue(detective: Detective, word: string): number {
  const entry = detective.counts.get(word);
  if (!entry) return 0;
  const { smoothing: a, vocabulary: v } = detective;
  return (
    Math.log((entry.spam + a) / (detective.spamWords + a * v)) -
    Math.log((entry.ham + a) / (detective.hamWords + a * v))
  );
}

export type Verdict = {
  /** Each word's clue, in the message's order. */
  clues: number[];
  /** Starting lean from how common spam is, then every clue added. */
  start: number;
  total: number;
  /** Chance it is spam, 0–1. */
  chance: number;
};

/** Adds up the clues of a message, starting from how common spam is. */
export function judge(detective: Detective, words: readonly string[]): Verdict {
  const start =
    detective.spamMessages > 0 && detective.hamMessages > 0
      ? Math.log(detective.spamMessages / detective.hamMessages)
      : 0;
  const clues = words.map((word) => clue(detective, word));
  const total = clues.reduce((sum, value) => sum + value, start);
  return { clues, start, total, chance: 1 / (1 + Math.exp(-total)) };
}
