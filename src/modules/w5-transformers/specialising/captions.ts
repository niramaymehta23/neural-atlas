// Every word the learner sees in this lesson, kept here so the 12-year-old review covers it all.
import { count, sentenceStart } from "@/design/copy";

export const captions = {
  opening:
    "A chatbot that has read a lot can learn a new style quickly. This little writer already knows everyday sentences. Teach it to talk like a pirate, and keep an eye on what else changes.",
  story:
    "It picks up the pirate style within a few dozen practice steps, because it already knows letters and words. But practising only pirate talk wears away its everyday writing, unless it keeps rereading some of it.",
  compare: {
    label: "Compare with rereading half everyday writing",
    leftLabel: "Your practice",
    rightLabel: "Half everyday",
  },
};

export const PIRATE = `Arr, ahoy me hearties! Ye be sailin' on the salty sea. The captain be lookin' for treasure, matey. Hoist the sails and swab the deck!
Avast ye scallywags! The parrot be squawkin' and the cannon be roarin'. Yo ho ho, me buckos, there be gold on that island!
`;

export const words = {
  box: "The special style it practises",
  bringBack: "Bring back the pirate talk",
  short: "Give it at least two letters to practise on.",
  practise: "Practise",
  pause: "Pause",
  again: "Start again from the everyday writer",
  steps: (steps: number, done: boolean) =>
    steps === 0
      ? "It hasn't practised the new style yet."
      : `${sentenceStart(count(steps))} practice ${steps === 1 ? "step" : "steps"}${done ? ", as many as it gets here." : "."}`,
  writes: "What it writes now, starting from “The cat”",
  writesLabel: "What the writer writes now.",
  pirate: (yes: boolean) => (yes ? "It talks like a pirate." : "No pirate talk yet."),
  everyday: (surprise: number) => {
    if (surprise < 0.8) return "Its everyday writing is as good as ever.";
    if (surprise < 2) return "Its everyday writing is getting worse.";
    return "It has forgotten how to write everyday sentences.";
  },
  learning: {
    label: "How big each practice step is",
    describe: (value: number) =>
      value < 0.002 ? "Small steps" : value < 0.006 ? "Medium steps" : "Big steps",
  },
  mix: {
    label: "How much everyday writing it rereads",
    describe: (value: number) =>
      value < 0.05
        ? "None: only the new style"
        : value < 0.4
          ? "A little"
          : value < 0.6
            ? "About half"
            : "Most of it",
  },
  model: {
    loading: "Fetching the everyday writer…",
    failed: "The writer could not be fetched. Check your connection and try again.",
    retry: "Try again",
  },
  failed:
    "The writer stopped practising because something went wrong. Start again to try once more.",
  describe: {
    waiting: "The writer is getting ready.",
    done: (steps: string, pirate: string, everyday: string) => `${steps} ${pirate} ${everyday}`,
  },
  drawer: [
    {
      title: "How the writer specialises",
      paragraphs: [
        "This writer was first trained here on lots of everyday sentences about animals, pets and stories. Now it practises on your special style, starting from what it already knows instead of from nothing.",
        "Every practice step nudges all of its numbers towards the new style. Nothing protects the old skills, so practising only the new style slowly overwrites them. Rereading some everyday writing while practising keeps them in use.",
        "Real chatbots are specialised the same way, with far bigger models: to follow instructions, to write code, or to speak in a company's style.",
      ],
    },
    {
      title: "The maths",
      paragraphs: [
        "This is fine-tuning: further gradient steps from pretrained weights on a small new dataset. Losing old skills is called catastrophic forgetting; mixing old data back in is called rehearsal or replay.",
        "“Everyday writing” is measured as the average next-letter surprise (cross-entropy) on everyday sentences the writer never practises on here.",
      ],
    },
  ],
};

export const missionWords = {
  goal: "Make it forget everything else",
  hint: "Practise only the pirate talk, with nothing everyday to reread, and keep going.",
  success:
    "Practising one style with nothing else to reread wore away its everyday writing. Chatbot makers mix ordinary text back in so a new skill doesn't erase the old ones.",
};

export const predictionWords = {
  question: "Teach it only pirate talk for a hundred steps. What happens to its everyday writing?",
  same: "It stays just as good",
  worse: "It gets much worse",
};
