import { count, outOf, sentenceStart } from "@/design/copy";
import type { GardenModel } from "@/engine/lab/garden-run";
import type { BoardAgent } from "@/engine/lab/board-run";
import type { BoardName, GardenName } from "./model";

/** Every word of the sandbox. */
export const sandboxCaptions = {
  place: {
    label: "Where to learn",
    garden: "A garden of dots",
    board: "A board to walk",
  },
  gardens: {
    label: "The garden",
    names: {
      blobs: "Two clumps",
      moons: "Two crescents",
      circles: "A ring around a middle",
      xor: "Four corners",
      spiral: "Two arms winding round",
      own: "Your own dots",
    } satisfies Record<GardenName, string>,
  },
  models: {
    label: "The learner",
    names: {
      line: "One straight line",
      team: "A small team",
      bigTeam: "A big team",
      neighbours: "Ask the neighbours",
      questions: "Twenty questions",
      crowd: "A crowd of guessers",
      relay: "A relay of fixers",
      road: "The widest road",
    } satisfies Record<GardenModel, string>,
    notes: {
      line: "It can only draw one straight fence, so it turns the fence until it has done its best.",
      team: "A few cells pass signals along. Each round, every thread shifts a little to make fewer mistakes.",
      bigTeam: "Two rows of cells. It can draw almost any shape, and takes far more work to do it.",
      neighbours: "It remembers more and more dots, and asks the nearest few about each new spot.",
      questions: "It splits the garden with one more yes-or-no question each time.",
      crowd: "Many guessers, each shown a different handful of dots, put it to a vote.",
      relay: "Each runner fixes a bit of what the runners before it still get wrong.",
      road: "It looks for the widest clear road between the two kinds.",
    } satisfies Record<GardenModel, string>,
  },
  boards: {
    label: "The board",
    names: {
      kitchen: "A kitchen",
      corridor: "A long way round",
      cliff: "Along the edge",
      open: "Wide open",
      own: "Your own board",
    } satisfies Record<BoardName, string>,
  },
  agents: {
    label: "The learner",
    names: {
      scores: "A score keeper",
      habits: "A habit follower",
      planner: "A planner with a map",
      coach: "A player and a coach",
      wanderer: "A wanderer",
    } satisfies Record<BoardAgent, string>,
    notes: {
      scores: "It keeps a score for every move from every square, and fixes the scores as it goes.",
      habits: "It tries things, and leans a little more towards whatever turned out well.",
      planner:
        "It has the whole map, so it works out how good each square is without a single try.",
      coach:
        "The player picks the moves. The coach guesses how each square will turn out, and corrects the player.",
      wanderer:
        "It picks every move at random and learns nothing. Anything that learns should beat it.",
    } satisfies Record<BoardAgent, string>,
  },
  garden: {
    label: "The garden: tap to plant dots, or pull them up",
    brush: {
      label: "Tap to:",
      groups: ["Plant a round dot", "Plant a pointy dot"] as const,
      pull: "Pull dots up",
    },
    paint: {
      instructions:
        "Arrow keys move a ring around the garden; Enter or Space plants or pulls up dots, depending on the choice beside it.",
      position: (across: string, up: string) => `${across}% across, ${up}% up`,
      planted: (thing: string, across: string, up: string) =>
        `A ${thing} planted at ${across}% across, ${up}% up`,
      things: ["round dot", "pointy dot"],
      removed: (things: string, across: string, up: string) =>
        `Pulled up ${things} at ${across}% across, ${up}% up`,
      taken: (number: string, one: boolean) => (one ? "one dot" : `${number} dots`),
      nothing: "nothing",
    },
    full: "The garden is full. Pull some dots up to plant more.",
    empty: "Plant some dots of both kinds, then press start.",
    remembered: (dots: number) =>
      `${sentenceStart(count(dots))} ${dots === 1 ? "dot" : "dots"} remembered so far.`,
    network: "The team: thicker threads pull harder",
  },
  board: {
    label: (name: string) => `The board: ${name}. Tap a square to paint it, then press start.`,
    brush: {
      label: "Tap to paint:",
      names: { floor: "Floor", wall: "Wall", trap: "Lava", coin: "Treat", goal: "Bowl" },
    },
    instructions:
      "Arrow keys move around the board; Enter or Space paints the square with the chosen brush.",
    square: (row: string, column: string, kind: string) => `Row ${row}, square ${column}: ${kind}`,
    kinds: { floor: "floor", wall: "wall", trap: "lava", coin: "treat", goal: "bowl" },
    key: "Arrows show which way it leans; a plus and a warm glow mean it likes that square.",
    blocked: "No way through: walls or lava block every way to the bowl.",
    noGoal: "There is no bowl on this board, so there is nothing to reach.",
  },
  curve: {
    garden: "How many new dots it gets right, step by step",
    board: "How often it reaches the bowl, step by step",
  },
  result: {
    gardenStart: "It has not practised yet.",
    fresh: (right: number) =>
      `It puts ${outOf(right, { total: 100, noun: "new dots" })} in the right group.`,
    own: (right: number) =>
      `It puts ${outOf(right, { total: 100, noun: "of your dots" })} in the right group.`,
    board: (right: number) =>
      `It would reach the bowl ${outOf(right, { total: 100, noun: "times" })}.`,
  },
  verdict: {
    garden: (right: number) =>
      right >= 0.95
        ? "It has the garden worked out."
        : right >= 0.8
          ? "Mostly there, with a few muddles."
          : right >= 0.6
            ? "Better than guessing, but this pair is a poor match."
            : "No better than guessing: this learner cannot draw this shape.",
    board: (right: number) =>
      right >= 0.9
        ? "It finds the bowl nearly every time."
        : right >= 0.4
          ? "It gets there some of the time."
          : "It hardly ever gets there.",
  },
  progress: (share: number) =>
    share <= 0
      ? "Ready to start"
      : share >= 1
        ? "Finished practising"
        : share < 0.5
          ? "Under half way"
          : "Over half way",
  start: "Start practising",
  pause: "Pause",
  again: "Start over",
  shuffle: "New dots",
  shuffleBoard: "New luck",
  clear: "Clear it all",
  describe: (learner: string, place: string, verdict: string) =>
    `${learner}, learning ${place}. ${verdict}`,
  setUp: "Set it up",
  watch: "How it is going",
};
