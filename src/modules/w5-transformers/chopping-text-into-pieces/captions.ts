// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "A chatbot doesn't read letter by letter, and it doesn't read whole words either. It chops text into pieces first. Type anything below and watch where the cuts fall.",
  story:
    "Common words are often one piece, while rare words, other alphabets and emoji get chopped small. Each piece costs the same, so some writing costs the chatbot far more than other writing.",
  compare: {
    label: "Compare your pieces with a very different set of known pieces",
    leftLabel: "Your pieces",
    rightLabel: "Other set",
  },
};

/** Ready-made texts to try. */
export const SAMPLES = {
  english: "Good morning, my friend! How are you today?",
  gujarati: "સુપ્રભાત, મારા મિત્ર! આજે તમે કેમ છો?",
  emoji: "🐶🐱🦊🐸 🍕🍦🎉 👩‍👩‍👧",
  code: "for (let i = 0; i < 10; i++) { total += i; }",
} as const;

export const words = {
  box: "Type anything",
  samples: {
    label: "Or try",
    english: "English",
    gujarati: "Gujarati",
    emoji: "Emoji",
    code: "Computer code",
  },
  known: {
    label: "How many pieces it knows",
    describe: (pieces: string) => `${sentenceStart(pieces)} pieces`,
  },
  longest: {
    label: "Longest piece it may use",
    describe: (letters: string, whole: boolean) =>
      whole ? "any length" : `${sentenceStart(letters)} letters at most`,
    one: "one letter at most",
  },
  cost: (pieces: number, letters: number) =>
    `${sentenceStart(count(pieces))} ${pieces === 1 ? "piece" : "pieces"} for ${count(letters)} ${letters === 1 ? "letter" : "letters"}.`,
  dearer: "That costs more pieces than it has letters.",
  cheaper: "Most pieces here hold more than one letter.",
  even: "About one piece for every letter.",
  empty: "Type something to see it chopped up.",
  partLabel: "part of a letter",
  part: "A diamond is part of one letter: some letters are stored as several small bits, and the chopper can split them.",
  space: "A dot stands for a space. Spaces usually stick to the front of the next word.",
  picture: "Your text, cut into pieces. Each piece sits in its own box.",
  pieceLabel: (at: number, text: string) => `Piece ${count(at)}: ${text}`,
  model: {
    loading: "Fetching the chopper’s list of pieces…",
    failed: "The list of pieces could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  describe: {
    waiting: "The chopper is getting ready.",
    empty: "There is no text to chop yet.",
    done: (cost: string) => `Your text is chopped into pieces. ${cost}`,
  },
  drawer: [
    {
      title: "How the chopper works",
      paragraphs: [
        "Every letter is first stored as one to four small bits (an English letter is one bit, a Gujarati letter three, most emoji four).",
        "Then the chopper glues neighbouring bits back together, using a list of glue steps it learned by reading lots of text. Pairs that turned up most often were learned first, so common words end up as one piece.",
        "“How many pieces it knows” uses only the first part of that list. With none of it, every bit is its own piece. “Longest piece it may use” stops it gluing past that many letters.",
        "The list here is the one GPT-2 used, made by OpenAI and shared under a modified MIT licence. It was learned mostly from English, which is why English is cheap and other writing is dear.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is byte-pair encoding. Text is split into bytes (UTF-8). Starting from single bytes, the chopper repeatedly merges the adjacent pair with the best rank in its list of 50,000 merges, until no listed pair is left. GPT-2 has 50,257 pieces: 256 bytes, 50,000 merges and one end marker.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Find writing that costs more pieces than it has letters",
  hint: "Try another alphabet, or a row of emoji, with every piece known.",
  success:
    "The chopper learned its pieces mostly from English. Writing it rarely saw gets cut into tiny bits, so the same message can cost several times as much.",
};

export const predictionWords = {
  question: `Which costs more pieces: “${SAMPLES.english}” or the same greeting in Gujarati?`,
  english: "The English",
  gujarati: "The Gujarati",
  same: "About the same",
};
