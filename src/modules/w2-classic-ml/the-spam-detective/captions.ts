// Every word the learner sees in this lesson, kept here so the 12-year-old review covers every word.
export const captions = {
  opening:
    "A detective reads every message before it reaches you and decides: spam or not? It has seen a pile of old messages already, so it knows which words turn up a lot in spam.",
  story:
    "The detective never understands the message. It just adds up clues: each word nudges it towards spam or towards normal, and the total decides. That’s why a pile of friendly words can hide a spammy one.",
  compare: {
    label: "Compare with the opposite care for rare words",
    leftLabel: "Your detective",
    rightLabel: "Opposite care",
  },
};

/** The old messages the detective learned from. */
export const examples = [
  { text: "Congratulations you are a winner claim your free prize now", spam: true },
  { text: "Win a free phone today just send your bank details", spam: true },
  { text: "Free money is waiting for you act now", spam: true },
  { text: "Cheap watches and free gifts buy now", spam: true },
  { text: "You have won cash claim the prize today", spam: true },
  { text: "Limited offer win free tickets now", spam: true },
  { text: "Urgent your account needs your password now", spam: true },
  { text: "Get rich fast with this free cash offer", spam: true },
  { text: "Are we still meeting at the park after school", spam: false },
  { text: "Mum says dinner is at six tonight", spam: false },
  { text: "Can you bring the football to practice tomorrow", spam: false },
  { text: "Thanks for the birthday cake it was lovely", spam: false },
  { text: "The school trip is on Friday bring a packed lunch", spam: false },
  { text: "See you at the library after lunch", spam: false },
  { text: "Grandma is coming to visit this weekend", spam: false },
  { text: "Did you finish the maths homework", spam: false },
  { text: "Happy birthday hope you have a great day", spam: false },
  { text: "Practice is off today because of the rain", spam: false },
] as const;

export const words = {
  message: "The message",
  placeholder: "Type a message for the detective to read",
  example: "Try Grandma’s message",
  grandma: "Come and win a free cake at the school fair, love from Grandma",
  clues: "What each word tells the detective",
  leans: {
    spam: (word: string, strength: string) => `${word}: ${strength} for spam`,
    normal: (word: string, strength: string) => `${word}: ${strength} for normal`,
    none: (word: string) => `${word}: no clue, never seen it`,
  },
  noWords: "Type a few words and the detective will read them.",
  verdict: { spam: "Spam!", normal: "Not spam", label: "The detective says" },
  sure: "How sure it is that this is spam",
  line: "Where it starts saying spam",
  tooLong: "That’s as long as a message can be here.",
  caution: {
    label: "How careful with rare words",
    bold: "trusts even a word seen once",
    middle: "a little careful",
    careful: "very careful",
  },
  suspicion: {
    label: "How sure before it says spam",
    quick: "says spam at the first hint",
    middle: "wants to be fairly sure",
    slow: "only when it’s almost certain",
  },
  learned: "The old messages it learned from",
  strength: { 1: "a weak clue", 2: "a clue", 3: "a strong clue" },
  spamTag: "spam",
  normalTag: "not spam",
  describe: {
    empty: "The message is empty.",
    read: (count: string, verdict: string) => `The detective read ${count} and says: ${verdict}`,
    words: (count: string, one: boolean) => (one ? "one word" : `${count} words`),
  },
  drawer: {
    mechanics: "How the detective decides",
    count:
      "From the old messages, it counts how often each word turned up in spam and how often in normal messages.",
    clue: "A word that turned up much more in spam is a clue for spam; one that turned up more in normal messages is a clue against. A word it has never seen tells it nothing.",
    add: "It starts from how common spam was in the pile, then adds every word’s clue. It never looks at the order of the words or what they mean together.",
    careful:
      "“How careful with rare words” pretends every word was seen a few extra times in both piles, so a word seen just once can’t shout too loudly.",
    maths: "The maths",
    formula:
      "Score = log(spam messages ÷ normal ones) + Σ log(P(word | spam) ÷ P(word | normal)), where P(word | spam) = (times in spam + care) ÷ (spam words + care × all the words it knows). Chance of spam = 1 ÷ (1 + e^(−score)).",
  },
};

export const missionWords = {
  salad: {
    goal: "Sneak three spammy words past the detective",
    hint: "Keep three words like “free”, “win” and “prize”, then add lots of normal words, like “school”, “birthday” and “park”.",
    success:
      "The detective only adds up clues, one word at a time. Bury a few spammy words under lots of friendly ones and the total tips to “not spam”, even though anyone can see what the message is really after.",
  },
};

export const predictionWords = {
  question:
    "Grandma writes: “Come and win a free cake at the school fair, love from Grandma.” Will the detective call it spam?",
  spam: "Spam",
  normal: "Not spam",
};
