import { count } from "@/design/copy";
import type { IdeaCard, MiniSpec } from "./minis";

/** Words of the idea cards' frame and of their small things to play with. */
export const glossaryCaptions = {
  open: (title: string) => `Open the lesson: ${title}`,
  nearby: "Ideas close by",
  lead: "The real word is",
  tryIt: "Try it",
  heading: "Every idea, on a card",
  headingNote:
    "Each card says one idea in a line and has a small thing to try. You’ll find the same cards beside the words all over the site.",
  mini: {
    line: {
      dial: "Tilt",
      far: "Far off",
      close: "Closer",
      best: "That’s about as good as it gets",
    },
    lineLabel: "Dots, and a line to tilt through them",
    valley: {
      step: "Take a step",
      again: "Back to the top",
      dial: "Step size",
      small: "small",
      big: "big",
      label: "A ball on a slope",
      bottom: "It has reached the bottom.",
      stuck: "It is stuck in a small dip.",
      over: "It jumped right over.",
      going: "Still going down.",
      ready: "Ready at the top.",
    },
    bars: { dial: "From even to certain", even: "nearly even", sure: "almost certain" },
    map: {
      start: "Tap one to see which are close to it.",
      near: (word: string, near: string) => `Closest to ${word}: ${near}.`,
      label: "A small map",
    },
    cells: {
      on: (word: string) => `${word}: yes`,
      off: (word: string) => `${word}: no`,
      yes: (out: string) => `It says: ${out}.`,
      no: (out: string) => `It says: not ${out}.`,
      label: "A cell adding up what it is told",
    },
    curve: { label: "Dots, and a curve following them" },
    picture: { label: "A small picture of a sailing boat" },
    threads: {
      start: "Tap a word to see where it looks.",
      looks: (word: string, at: string) => `“${word}” looks at ${at}.`,
      and: " and ",
    },
    window: {
      dial: "How much fits",
      seen: (words: number) => `It can see ${count(words)} ${words === 1 ? "word" : "words"}.`,
    },
    glow: { dial: "How far the glow spreads", label: "Squares glowing around a bowl" },
    tries: {
      start: "Tap any of them, as often as you like.",
      tally: (hits: number, tries: number) => `${count(hits)} out of ${count(tries)} so far.`,
    },
    fence: {
      dial: "Slide the fence",
      label: "Round dots and pointy dots, and a fence between them",
      wrong: (dots: number) =>
        dots === 0 ? "Every dot is on its own side." : `${count(dots)} on the wrong side.`,
    },
    loop: { next: "Next", label: "Steps that go round and round" },
  },
};

const bars = (
  labels: readonly string[],
  low = "nearly even",
  high = "almost certain",
): MiniSpec => ({
  kind: "bars",
  labels,
  low,
  high,
});
const loop = (...steps: string[]): MiniSpec => ({ kind: "loop", steps });
const curve = (low: string, high: string): MiniSpec => ({ kind: "curve", low, high });
const cells = (ins: readonly string[], out: string): MiniSpec => ({ kind: "cells", ins, out });

/** One card per idea, by its lesson's id. */
export const ideaCards: Record<string, IdeaCard> = {
  "teach-by-showing": {
    idea: "Show a machine examples and it works out the pattern for itself. Nobody writes the rule.",
    mini: { kind: "fence" },
  },
  "what-the-machine-sees": {
    idea: "A machine knows only the facts it is given. Leave one out and it can never use it.",
    mini: cells(["Big garden", "Near a school", "Needs fixing"], "a dear house"),
  },
  "drawing-the-best-line": {
    idea: "The best line is the one that makes all its misses, added together, as small as they can be.",
    mini: { kind: "line" },
  },
  "splitting-into-groups": {
    idea: "A fence between two kinds of things tells you which kind a new one is.",
    mini: { kind: "fence" },
  },
  "keeping-score-of-mistakes": {
    idea: "To get better, a machine needs one number that says how wrong it is. It then makes that number smaller.",
    mini: { kind: "line" },
  },
  "rolling-downhill": {
    idea: "Feel which way the ground slopes, take a step downhill, and repeat. That is how most machines learn.",
    mini: { kind: "valley" },
  },
  "memorising-vs-understanding": {
    idea: "Too much freedom and a learner bends to fit every example, even the silly ones.",
    mini: curve("stiff", "wiggly"),
  },
  "the-surprise-test": {
    idea: "Keep some examples hidden while it practises. Only those can say how well it really learned.",
    mini: loop("Hide some questions", "Practise on the rest", "Test on the hidden ones"),
  },
  "stubborn-vs-jumpy": {
    idea: "A stubborn learner misses the same way every time. A jumpy one misses in a new way every time.",
    mini: curve("stubborn", "jumpy"),
  },
  "how-sure-is-it": {
    idea: "A good guesser also says how sure it is, and is less sure near the fence.",
    mini: bars(["daisy", "tulip"], "unsure", "sure"),
  },
  "ask-the-neighbours": {
    idea: "To guess about something new, look at the known things closest to it and let them vote.",
    mini: {
      kind: "map",
      places: [
        ["Foxes fan", 20, 30],
        ["Owls fan", 80, 65],
        ["new family", 34, 44],
        ["Owls fan too", 72, 30],
        ["Foxes fan too", 25, 72],
      ],
    },
  },
  "twenty-questions": {
    idea: "Yes-or-no questions, one after another, can cut any map into boxes with one answer each.",
    mini: loop("Ask a question", "Split in two", "Ask about each half"),
  },
  "wisdom-of-the-crowd": {
    idea: "Many so-so guessers who make different mistakes beat one good guesser, if they vote.",
    mini: bars(["robin", "wren"], "split vote", "clear vote"),
  },
  "the-mistake-relay": {
    idea: "Each helper fixes only what the ones before still got wrong.",
    mini: loop("Guess", "Find what’s still wrong", "Add a helper for that"),
  },
  "the-widest-road": {
    idea: "The safest border leaves the most room on both sides. Only the closest dots decide where it goes.",
    mini: { kind: "fence" },
  },
  "the-spam-detective": {
    idea: "Add up small clues, each nudging towards yes or no, and let the total decide.",
    mini: cells(["“free”", "“winner”", "from a friend"], "spam"),
  },
  "finding-natural-groups": {
    idea: "Grab the closest dots, move to their middle, and repeat: groups appear without any names.",
    mini: loop("Grab the closest", "Move to the middle"),
  },
  "the-best-shadow": {
    idea: "A flat shadow can keep nearly all of a shape, if the light comes from the right side.",
    mini: { kind: "picture", effect: "shrink", low: "everything kept", high: "squashed" },
  },
  "a-map-of-everything": {
    idea: "Things measured in many ways can be drawn flat, with alike things close together.",
    mini: {
      kind: "map",
      places: [
        ["lion", 20, 25],
        ["tiger", 30, 34],
        ["trout", 80, 30],
        ["salmon", 72, 40],
        ["owl", 45, 76],
      ],
    },
  },
  "is-99-percent-actually-good": {
    idea: "One score can hide a lot. Ask how many it caught, and how many alarms were real.",
    mini: bars(["fine apples", "wormy apples"], "half are wormy", "hardly any"),
  },
  "one-tiny-brain-cell": {
    idea: "A cell adds up what it hears, trusting some voices more, and says yes if the total is big enough.",
    mini: cells(["Sunny", "Weekend", "Friends going"], "go to the park"),
  },
  "the-decision-curve": {
    idea: "Without a bend, stacked cells only make straight lines. With one, they can follow a wave.",
    mini: curve("no bend", "lots of bend"),
  },
  "stacking-cells": {
    idea: "Each cell draws one gentle fence. Stacked up, their fences wrap round any shape.",
    mini: cells(["Cell one", "Cell two", "Cell three"], "inside the patch"),
  },
  "thinking-forwards": {
    idea: "Facts go in at one end. Each layer mixes what the last one said, until an answer comes out.",
    mini: loop("Facts go in", "Each layer mixes", "An answer comes out"),
  },
  "passing-back-the-blame": {
    idea: "When the answer is wrong, the blame travels back layer by layer, so each cell knows its share.",
    mini: loop("Answer", "See the mistake", "Pass the blame back", "Shift each thread"),
  },
  "smarter-ways-downhill": {
    idea: "Keep your speed, or change your stride, and you reach the bottom sooner than with plain steps.",
    mini: { kind: "valley", bumpy: true },
  },
  "big-steps-then-small": {
    idea: "Start with big steps to get there fast. Finish with small ones to settle.",
    mini: { kind: "valley" },
  },
  "where-you-start": {
    idea: "Where a learner starts can decide where it ends up.",
    mini: { kind: "valley", bumpy: true },
  },
  "dont-cram": {
    idea: "Switch some cells off at random while practising, and no cell can lean on the others.",
    mini: cells(["Cell one", "Cell two", "Cell three"], "a cat"),
  },
  "keeping-things-steady": {
    idea: "Keep every layer’s signals calm, not too quiet and not too wild, and even a deep stack can learn.",
    mini: bars(["first layer", "middle layer", "last layer"], "kept steady", "left alone"),
  },
  "it-can-draw-anything": {
    idea: "Enough small bends, side by side, can copy any squiggle at all.",
    mini: curve("few bends", "many bends"),
  },
  "the-pattern-torch": {
    idea: "Slide one small pattern over a picture, and note where it matches.",
    mini: { kind: "picture", effect: "edges", low: "the photo", high: "only edges" },
  },
  "how-machines-see": {
    idea: "First edges, then shapes made of edges, then things made of shapes.",
    mini: loop("Find edges", "Join them into shapes", "Join shapes into things"),
  },
  "zooming-out": {
    idea: "Shrink a picture and the detail goes, while the gist stays.",
    mini: { kind: "picture", effect: "shrink", low: "close up", high: "far away" },
  },
  "standing-on-giants": {
    idea: "Start from what a big network already knows, and a handful of examples is enough.",
    mini: cells(["Has whiskers", "Has petals", "Has fur"], "a cat"),
  },
  "reading-one-word-at-a-time": {
    idea: "Read word by word, carrying a little memory along. In long sentences the start fades.",
    mini: {
      kind: "window",
      words: ["rain", "fell", "all", "day", "so", "take"],
      low: "short memory",
      high: "long memory",
    },
  },
  "choosing-what-to-remember": {
    idea: "Gates on a memory choose what to keep, what to let in, and when to speak.",
    mini: loop("Keep or forget", "Let the new word in", "Read it out"),
  },
  "meaning-as-places": {
    idea: "Words that keep the same company end up close together on a map.",
    mini: {
      kind: "map",
      places: [
        ["cat", 22, 30],
        ["dog", 32, 40],
        ["apple", 78, 34],
        ["pear", 70, 46],
        ["run", 45, 78],
      ],
    },
  },
  "squeeze-and-rebuild": {
    idea: "Squeeze a picture into a few numbers, then draw it again. What matters most survives.",
    mini: { kind: "picture", effect: "shrink", low: "many numbers", high: "few numbers" },
  },
  "smooth-imagination": {
    idea: "Pack pictures neatly on a map, and every spot in between is a believable new picture.",
    mini: {
      kind: "map",
      places: [
        ["smiling", 22, 35],
        ["grinning", 34, 42],
        ["calm", 52, 52],
        ["sad", 78, 66],
        ["glum", 70, 74],
      ],
    },
  },
  "forger-vs-detective": {
    idea: "One makes fakes, one spots them, and each gets better because of the other.",
    mini: loop("Make a fake", "Try to spot it", "Both learn"),
  },
  "painting-from-fog": {
    idea: "Clear away a little fog at a time, and a new picture appears.",
    mini: { kind: "picture", effect: "fog", low: "clear", high: "pure fog" },
  },
  "learning-from-friends": {
    idea: "Everyone listens to their friends and moves a little towards what they think.",
    mini: {
      kind: "threads",
      words: ["Ana", "Ben", "Cal", "Dee"],
      links: [[1, 2], [0, 2], [0, 1, 3], [2]],
    },
  },
  "chopping-text-into-pieces": {
    idea: "A chatbot reads text in pieces: whole common words, and scraps of rare ones.",
    mini: loop("unbelievable", "un · believable", "un · believ · able"),
  },
  "words-as-places": {
    idea: "Every word has a spot on a giant map, and directions on it can mean something.",
    mini: {
      kind: "map",
      places: [
        ["man", 20, 70],
        ["woman", 40, 78],
        ["king", 28, 24],
        ["queen", 48, 32],
        ["apple", 82, 60],
      ],
    },
  },
  "who-is-looking-at-whom": {
    idea: "To understand one word, a machine looks at the others that help explain it.",
    mini: {
      kind: "threads",
      words: ["the", "cat", "said", "it", "slept"],
      links: [[1], [4], [1], [1], [1, 3]],
    },
  },
  "many-readers-at-once": {
    idea: "Several readers look at the same line at once, each after something different.",
    mini: {
      kind: "threads",
      words: ["she", "gave", "him", "her", "coat"],
      links: [[1], [0, 4], [1], [0], [1, 3]],
    },
  },
  "knowing-the-order": {
    idea: "Give each word a stamp saying where it sits, or “dog bites man” reads like “man bites dog”.",
    mini: loop("dog bites man", "bites man dog", "man bites dog"),
  },
  "the-thinking-block": {
    idea: "Look around at the other words, think it over, add it to what you had. Then again.",
    mini: loop("Look around", "Think it over", "Add it on"),
  },
  "guess-the-next-word": {
    idea: "Guess what word comes next, add it, and guess again. That is how a chatbot writes.",
    mini: bars(["sat", "ran", "slept", "sang"]),
  },
  "safe-vs-adventurous": {
    idea: "Pick only the likeliest word and it is safe and dull. Give unlikely ones a chance and it gets wild.",
    mini: bars(["sat", "ran", "slept", "sang"], "wild", "boring"),
  },
  "reading-the-internet": {
    idea: "Guess the next piece of a mountain of text, check, and adjust. Billions of times.",
    mini: loop("Read a bit", "Guess what’s next", "Check and adjust"),
  },
  "bigger-and-bigger": {
    idea: "More cells, more reading and more computing make better guesses, if all three grow together.",
    mini: bars(["cells", "reading", "computing"], "all grow", "only one grows"),
  },
  "short-term-memory": {
    idea: "Only so many words fit in front of it. What slides out of view is gone.",
    mini: {
      kind: "window",
      words: ["my", "fish", "is", "called", "Bob", "hello"],
      low: "short view",
      high: "long view",
    },
  },
  specialising: {
    idea: "A few dozen examples teach an old writer a new style, though it may forget some of the old.",
    mini: bars(["everyday words", "pirate words"], "before", "after"),
  },
  "learning-from-thumbs-up": {
    idea: "People pick the better of two answers, and it learns to give more of what they pick.",
    mini: loop("Two answers", "A person picks one", "More like that"),
  },
  "looking-things-up": {
    idea: "Find the pages that match the question first, then answer from them.",
    mini: {
      kind: "map",
      places: [
        ["your question", 32, 40],
        ["a book on whales", 40, 52],
        ["a book on ships", 58, 30],
        ["a cookbook", 82, 74],
      ],
    },
  },
  "ai-that-takes-actions": {
    idea: "Think, use a tool, check what came back. Repeat until the job is done.",
    mini: loop("Think", "Use a tool", "Check"),
  },
  "pictures-and-words-together": {
    idea: "Put pictures and words on one map, and a photo lands near the words for it.",
    mini: {
      kind: "map",
      places: [
        ["photo of a cat", 24, 34],
        ["“a sleepy cat”", 36, 44],
        ["photo of a car", 76, 36],
        ["“a red car”", 70, 52],
      ],
    },
  },
  "confident-but-wrong": {
    idea: "It writes what sounds likely, whether or not it is so. Sounding sure is not being right.",
    mini: bars(["sounds right", "is right"], "careful", "bluffing"),
  },
  "treats-and-tricks": {
    idea: "Do something, see if a treat comes, and do more of what brought treats.",
    mini: {
      kind: "tries",
      options: ["Sit", "Roll", "Bark"],
      odds: [0.8, 0.2, 0.1],
      hit: "Treat!",
      miss: "No treat.",
    },
  },
  "new-or-favourite": {
    idea: "Every go on your favourite is a go not spent finding something better.",
    mini: {
      kind: "tries",
      options: ["Machine one", "Machine two", "Machine three"],
      odds: [0.3, 0.6, 0.45],
      hit: "It paid!",
      miss: "Nothing.",
    },
  },
  "the-game-board": {
    idea: "Places, moves, chances and prizes. Know all four and the best move can be worked out.",
    mini: { kind: "glow", low: "only next to it", high: "everywhere" },
  },
  "now-vs-later": {
    idea: "A prize far away counts for a bit less with every move it takes to reach it.",
    mini: { kind: "glow", low: "only now counts", high: "later counts too" },
  },
  "good-places-to-be": {
    idea: "A square is a good place to be if a good place is one move away.",
    mini: { kind: "glow", low: "a little", high: "a lot" },
  },
  "scoring-every-move": {
    idea: "Keep a score for every move from every square, and fix it after each try.",
    mini: { kind: "glow", low: "first tries", high: "many tries" },
  },
  "a-brain-for-the-game": {
    idea: "When there are too many squares for a table, let a network guess the scores.",
    mini: cells(["Fruit on the left", "Basket on the right", "Nearly landed"], "move left"),
  },
  "nudging-habits": {
    idea: "After each try, make moves that went well a little more likely.",
    mini: bars(["left", "right", "up", "down"], "no habit yet", "strong habit"),
  },
  "player-and-coach": {
    idea: "One learns what to do, the other learns how well it is going. Each helps the other.",
    mini: loop("The player moves", "The coach judges", "The player adjusts"),
  },
  "survival-of-the-fittest": {
    idea: "Copy the best, change each copy a little, and let them all try again.",
    mini: loop("Race", "Keep the best", "Copy with small changes"),
  },
  "thinking-ahead": {
    idea: "Play lots of pretend games in your head, then make the move that went best.",
    mini: {
      kind: "tries",
      options: ["Left", "Middle", "Right"],
      odds: [0.35, 0.65, 0.4],
      hit: "Won that pretend game.",
      miss: "Lost that one.",
    },
  },
  "practising-against-yourself": {
    idea: "Play against your own copy. Each trick one finds, the other must learn to answer.",
    mini: loop("Play your copy", "One finds a trick", "The other answers it"),
  },
  loopholes: {
    idea: "A machine does what earns the treat, which is not always what you meant.",
    mini: {
      kind: "tries",
      options: ["Tidy one toy", "Tip it out and tidy again"],
      odds: [0.3, 0.95],
      hit: "Treat!",
      miss: "No treat.",
    },
  },
  "back-to-chatbots": {
    idea: "A judge learns what people like, and the chatbot practises until the judge is pleased.",
    mini: loop("Answer", "The judge scores it", "Do more of what scored"),
  },
};
