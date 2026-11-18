// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

const quote = (word: string) => `“${word}”`;

export const captions = {
  opening:
    "A real language model doesn't read a sentence with one pair of eyes. It has twelve readers reading at once, and each one looks for something different. Switch some off and see what goes missing.",
  story:
    "One reader checks the word before, another the word after, another the most important word. Together they build a fuller picture than any one of them could alone.",
  compare: {
    label: "Compare your readers with every reader switched on",
    leftLabel: "Your readers",
    rightLabel: "Every reader",
  },
};

export const words = {
  example: "The dog did not cross the road because it was tired.",
  sentence: "Type your own sentence",
  bringBack: "Bring back the example sentence",
  fewWords: "Type a few words to see the readers at work.",
  unread: "Only the first sixteen words are read.",
  reading: "Reading…",
  model: {
    loading: "Waking up the readers. The first visit takes a little while.",
    failed: "The readers couldn’t wake up or read this. Check your connection, then try again.",
    retry: "Try again",
  },
  depth: {
    label: "How deep it reads",
    describe: (depth: number) =>
      depth <= 2 ? "A first glance" : depth <= 4 ? "A closer look" : "A deep read",
  },
  gallery: "The twelve readers. Tap a reader to switch it off or on.",
  reader: {
    next: "Looks at the next word",
    before: "Looks at the word before",
    one: (word: string) => `Stares at ${quote(word)}`,
    around: "Looks all around",
  },
  readerLabel: (at: number, habit: string, on: boolean) =>
    `Reader ${count(at)}: ${habit}. ${on ? "Switched on" : "Switched off"}.`,
  off: "off",
  allOn: "Switch every reader on",
  allOff: "Switch every reader off",
  picture:
    "What the readers still on see together: each word on the left points to the word it looks at hardest on the right.",
  noReaders: "Every reader is switched off, so nothing is read at all.",
  sense: (agree: number, total: number) =>
    `${sentenceStart(count(agree))} of ${count(total)} words still look at the same word as with every reader on.`,
  lost: "The picture has stopped making sense.",
  kept: "The picture still mostly holds together.",
  describe: {
    waiting: "The readers are getting ready.",
    done: (on: number, line: string) =>
      `${sentenceStart(count(on))} ${on === 1 ? "reader is" : "readers are"} switched on. ${line}`,
  },
  drawer: [
    {
      title: "What the readers are",
      paragraphs: [
        "Each reader is a separate set of questions and answers the model learned. A word asks its question, every other word offers its answer, and the best fits get looked at hardest.",
        "Because each reader learned its own questions, they end up with different habits. The model blends what all twelve find before passing it on to the next reading pass.",
        "The readers here belong to all-MiniLM-L6-v2, a small real model made by sentence-transformers and shared under the Apache 2.0 licence. It runs in your browser, so your sentence never leaves it.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is multi-head attention: 12 heads per layer, 6 layers. Each head has its own query, key and value matrices; their outputs are joined side by side and mixed by one more matrix.",
        "The picture blends the attention weights of the heads still on and, for each word, draws its strongest link. Switching a head off here only changes the picture, not the model.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Switch readers off until the picture stops making sense",
  hint: "Keep switching readers off and watch how many words still find their word.",
  success:
    "No single reader holds the whole picture. Each one carries its own part, so losing readers loses the links only they were finding.",
};

export const predictionWords = {
  question: "Twelve readers read the same sentence. Do they all look at the same words?",
  same: "Yes, they all look at the same words",
  different: "No, they look for different things",
};
